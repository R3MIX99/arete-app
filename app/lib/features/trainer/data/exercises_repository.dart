import 'package:supabase_flutter/supabase_flutter.dart';

import '../domain/exercise.dart';
import 'catalog_failure.dart';

/// Acceso a la biblioteca de ejercicios de un entrenador.
///
/// Las políticas de Row Level Security ya limitan cada consulta a los
/// ejercicios del propio entrenador; el filtro explícito no está aquí
/// porque haga falta como mecanismo de seguridad, sino porque no hace
/// falta: no se agrega ningún `.eq('trainer_id', ...)` a propósito, para
/// que quede claro que la base de datos es la única que decide qué fila
/// devuelve.
class ExercisesRepository {
  const ExercisesRepository(this._client);

  final SupabaseClient _client;

  static const String _fields =
      'id, trainer_id, name, muscle_group, equipment, description, '
      'video_url, created_at';

  Future<List<Exercise>> fetchExercises() async {
    try {
      final rows = await _client
          .from('exercises')
          .select(_fields)
          .order('name');
      return rows.map(Exercise.fromJson).toList();
    } catch (error) {
      throw CatalogFailure.fromException(error);
    }
  }

  Future<Exercise> fetchExercise(String id) async {
    try {
      final row =
          await _client.from('exercises').select(_fields).eq('id', id).single();
      return Exercise.fromJson(row);
    } catch (error) {
      throw CatalogFailure.fromException(error);
    }
  }

  Future<Exercise> createExercise({
    required String trainerId,
    required String name,
    required MuscleGroup muscleGroup,
    required Equipment equipment,
    String? description,
    String? videoUrl,
  }) async {
    try {
      final row = await _client
          .from('exercises')
          .insert({
            'trainer_id': trainerId,
            'name': name.trim(),
            'muscle_group': muscleGroup.raw,
            'equipment': equipment.raw,
            if (description != null && description.trim().isNotEmpty)
              'description': description.trim(),
            if (videoUrl != null && videoUrl.trim().isNotEmpty)
              'video_url': videoUrl.trim(),
          })
          .select(_fields)
          .single();
      return Exercise.fromJson(row);
    } catch (error) {
      throw CatalogFailure.fromException(error);
    }
  }

  Future<void> updateExercise({
    required String exerciseId,
    required String name,
    required MuscleGroup muscleGroup,
    required Equipment equipment,
    String? description,
    String? videoUrl,
  }) async {
    try {
      await _client
          .from('exercises')
          .update({
            'name': name.trim(),
            'muscle_group': muscleGroup.raw,
            'equipment': equipment.raw,
            'description': (description == null || description.trim().isEmpty)
                ? null
                : description.trim(),
            'video_url':
                (videoUrl == null || videoUrl.trim().isEmpty)
                    ? null
                    : videoUrl.trim(),
          })
          .eq('id', exerciseId);
    } catch (error) {
      throw CatalogFailure.fromException(error);
    }
  }

  /// No es borrado lógico: un ejercicio sin uso se puede quitar sin
  /// dejar rastro. Si está usado en alguna rutina, la base de datos
  /// rechaza el borrado (`on delete restrict`) y se traduce a un mensaje
  /// claro en [CatalogFailure].
  Future<void> deleteExercise(String exerciseId) async {
    try {
      await _client.from('exercises').delete().eq('id', exerciseId);
    } catch (error) {
      throw CatalogFailure.fromException(error);
    }
  }
}
