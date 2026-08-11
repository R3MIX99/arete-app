import 'package:supabase_flutter/supabase_flutter.dart';

import '../../shared/models/client_goal.dart';
import '../domain/routine.dart';
import '../domain/routine_exercise.dart';
import 'catalog_failure.dart';

/// Selección anidada usada para traer una rutina completa (ejercicios y
/// series) en una sola consulta: evita ir serie por serie al servidor
/// cuando se abre el constructor.
const String _routineDetailFields =
    '*, routine_exercises('
    '*, exercises(*), routine_exercise_sets(*)'
    ')';

/// Acceso a las rutinas de entrenamiento de un entrenador y a los
/// ejercicios/series que las componen. Igual que en el resto del panel,
/// las políticas de Row Level Security son las que de verdad restringen
/// cada fila a su dueño; aquí no hace falta repetir el filtro.
class RoutinesRepository {
  const RoutinesRepository(this._client);

  final SupabaseClient _client;

  Future<List<Routine>> fetchRoutines() async {
    try {
      final rows = await _client
          .from('routines')
          .select()
          .order('created_at', ascending: false);
      return rows.map(Routine.fromJson).toList();
    } catch (error) {
      throw CatalogFailure.fromException(error);
    }
  }

  Future<RoutineDetail> fetchRoutineDetail(String routineId) async {
    try {
      final row = await _client
          .from('routines')
          .select(_routineDetailFields)
          .eq('id', routineId)
          .single();
      return RoutineDetail.fromJson(row);
    } catch (error) {
      throw CatalogFailure.fromException(error);
    }
  }

  Future<Routine> createRoutine({
    required String trainerId,
    required String name,
    required RoutineLevel level,
    String? description,
    ClientGoal? goal,
  }) async {
    try {
      final row = await _client
          .from('routines')
          .insert({
            'trainer_id': trainerId,
            'name': name.trim(),
            'level': level.raw,
            if (description != null && description.trim().isNotEmpty)
              'description': description.trim(),
            if (goal != null) 'goal': goal.raw,
          })
          .select()
          .single();
      return Routine.fromJson(row);
    } catch (error) {
      throw CatalogFailure.fromException(error);
    }
  }

  Future<void> updateRoutine({
    required String routineId,
    required String name,
    required RoutineLevel level,
    String? description,
    ClientGoal? goal,
  }) async {
    try {
      await _client
          .from('routines')
          .update({
            'name': name.trim(),
            'level': level.raw,
            'description':
                (description == null || description.trim().isEmpty)
                    ? null
                    : description.trim(),
            'goal': goal?.raw,
          })
          .eq('id', routineId);
    } catch (error) {
      throw CatalogFailure.fromException(error);
    }
  }

  Future<void> deleteRoutine(String routineId) async {
    try {
      await _client.from('routines').delete().eq('id', routineId);
    } catch (error) {
      throw CatalogFailure.fromException(error);
    }
  }

  /// Agrega un ejercicio de la biblioteca al final de la rutina.
  Future<RoutineExercise> addExerciseToRoutine({
    required String routineId,
    required String exerciseId,
    required int orderIndex,
    String? notes,
  }) async {
    try {
      final row = await _client
          .from('routine_exercises')
          .insert({
            'routine_id': routineId,
            'exercise_id': exerciseId,
            'order_index': orderIndex,
            if (notes != null && notes.trim().isNotEmpty)
              'notes': notes.trim(),
          })
          .select('*, exercises(*), routine_exercise_sets(*)')
          .single();
      return RoutineExercise.fromJson(row);
    } catch (error) {
      throw CatalogFailure.fromException(error);
    }
  }

  Future<void> updateRoutineExerciseNotes({
    required String routineExerciseId,
    String? notes,
  }) async {
    try {
      await _client
          .from('routine_exercises')
          .update({
            'notes': (notes == null || notes.trim().isEmpty)
                ? null
                : notes.trim(),
          })
          .eq('id', routineExerciseId);
    } catch (error) {
      throw CatalogFailure.fromException(error);
    }
  }

  Future<void> removeExerciseFromRoutine(String routineExerciseId) async {
    try {
      await _client
          .from('routine_exercises')
          .delete()
          .eq('id', routineExerciseId);
    } catch (error) {
      throw CatalogFailure.fromException(error);
    }
  }

  /// Reordena arrastrando y soltando: recibe la lista de ids de
  /// `routine_exercises` ya en el orden final y reescribe `order_index`
  /// de cada uno según su posición.
  Future<void> reorderExercises(List<String> orderedRoutineExerciseIds) async {
    try {
      for (var i = 0; i < orderedRoutineExerciseIds.length; i++) {
        await _client
            .from('routine_exercises')
            .update({'order_index': i})
            .eq('id', orderedRoutineExerciseIds[i]);
      }
    } catch (error) {
      throw CatalogFailure.fromException(error);
    }
  }

  Future<void> addSet({
    required String routineExerciseId,
    required int setNumber,
    required int targetRepsMin,
    required int targetRepsMax,
    required int restSeconds,
    double? suggestedWeight,
  }) async {
    try {
      await _client.from('routine_exercise_sets').insert({
        'routine_exercise_id': routineExerciseId,
        'set_number': setNumber,
        'target_reps_min': targetRepsMin,
        'target_reps_max': targetRepsMax,
        'rest_seconds': restSeconds,
        'suggested_weight': suggestedWeight,
      });
    } catch (error) {
      throw CatalogFailure.fromException(error);
    }
  }

  Future<void> updateSet({
    required String setId,
    required int targetRepsMin,
    required int targetRepsMax,
    required int restSeconds,
    double? suggestedWeight,
  }) async {
    try {
      await _client
          .from('routine_exercise_sets')
          .update({
            'target_reps_min': targetRepsMin,
            'target_reps_max': targetRepsMax,
            'rest_seconds': restSeconds,
            'suggested_weight': suggestedWeight,
          })
          .eq('id', setId);
    } catch (error) {
      throw CatalogFailure.fromException(error);
    }
  }

  Future<void> deleteSet(String setId) async {
    try {
      await _client.from('routine_exercise_sets').delete().eq('id', setId);
    } catch (error) {
      throw CatalogFailure.fromException(error);
    }
  }

  /// Duplica una rutina completa (ejercicios y series incluidos) como
  /// plantilla nueva e independiente: cambiar la copia no afecta a la
  /// original.
  Future<Routine> duplicateRoutine({
    required String routineId,
    required String newName,
  }) async {
    try {
      final source = await fetchRoutineDetail(routineId);
      final newRoutine = await createRoutine(
        trainerId: source.routine.trainerId,
        name: newName,
        level: source.routine.level,
        description: source.routine.description,
        goal: source.routine.goal,
      );

      for (final routineExercise in source.exercises) {
        final copiedExercise = await addExerciseToRoutine(
          routineId: newRoutine.id,
          exerciseId: routineExercise.exercise.id,
          orderIndex: routineExercise.orderIndex,
          notes: routineExercise.notes,
        );
        for (final set in routineExercise.sets) {
          await addSet(
            routineExerciseId: copiedExercise.id,
            setNumber: set.setNumber,
            targetRepsMin: set.targetRepsMin,
            targetRepsMax: set.targetRepsMax,
            restSeconds: set.restSeconds,
            suggestedWeight: set.suggestedWeight,
          );
        }
      }

      return newRoutine;
    } catch (error) {
      throw CatalogFailure.fromException(error);
    }
  }
}
