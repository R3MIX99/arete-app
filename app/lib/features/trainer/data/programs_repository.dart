import 'package:supabase_flutter/supabase_flutter.dart';

import '../../shared/models/client_goal.dart';
import '../domain/program.dart';
import '../domain/program_routine.dart';
import '../domain/weekday.dart';
import 'catalog_failure.dart';

const String _programDetailFields = '*, program_routines(*, routines(*))';

/// Acceso a los programas de un entrenador y a las rutinas ubicadas por
/// semana/día que los componen. Igual que en el resto del panel, las
/// políticas de Row Level Security son las que de verdad restringen cada
/// fila a su dueño.
class ProgramsRepository {
  const ProgramsRepository(this._client);

  final SupabaseClient _client;

  Future<List<Program>> fetchPrograms() async {
    try {
      final rows = await _client
          .from('programs')
          .select()
          .order('created_at', ascending: false);
      return rows.map(Program.fromJson).toList();
    } catch (error) {
      throw CatalogFailure.fromException(error);
    }
  }

  Future<ProgramDetail> fetchProgramDetail(String programId) async {
    try {
      final row = await _client
          .from('programs')
          .select(_programDetailFields)
          .eq('id', programId)
          .single();
      return ProgramDetail.fromJson(row);
    } catch (error) {
      throw CatalogFailure.fromException(error);
    }
  }

  Future<Program> createProgram({
    required String trainerId,
    required String name,
    required int durationWeeks,
    String? description,
    ClientGoal? goal,
  }) async {
    try {
      final row = await _client
          .from('programs')
          .insert({
            'trainer_id': trainerId,
            'name': name.trim(),
            'duration_weeks': durationWeeks,
            if (description != null && description.trim().isNotEmpty)
              'description': description.trim(),
            if (goal != null) 'goal': goal.raw,
          })
          .select()
          .single();
      return Program.fromJson(row);
    } catch (error) {
      throw CatalogFailure.fromException(error);
    }
  }

  Future<void> updateProgram({
    required String programId,
    required String name,
    required int durationWeeks,
    String? description,
    ClientGoal? goal,
  }) async {
    try {
      await _client
          .from('programs')
          .update({
            'name': name.trim(),
            'duration_weeks': durationWeeks,
            'description':
                (description == null || description.trim().isEmpty)
                    ? null
                    : description.trim(),
            'goal': goal?.raw,
          })
          .eq('id', programId);
    } catch (error) {
      throw CatalogFailure.fromException(error);
    }
  }

  Future<void> deleteProgram(String programId) async {
    try {
      await _client.from('programs').delete().eq('id', programId);
    } catch (error) {
      throw CatalogFailure.fromException(error);
    }
  }

  Future<ProgramRoutine> addRoutineToProgram({
    required String programId,
    required String routineId,
    required int weekNumber,
    required Weekday dayOfWeek,
    String? notes,
  }) async {
    try {
      final row = await _client
          .from('program_routines')
          .insert({
            'program_id': programId,
            'routine_id': routineId,
            'week_number': weekNumber,
            'day_of_week': dayOfWeek.raw,
            if (notes != null && notes.trim().isNotEmpty) 'notes': notes.trim(),
          })
          .select('*, routines(*)')
          .single();
      return ProgramRoutine.fromJson(row);
    } catch (error) {
      throw CatalogFailure.fromException(error);
    }
  }

  Future<void> removeProgramRoutine(String programRoutineId) async {
    try {
      await _client.from('program_routines').delete().eq('id', programRoutineId);
    } catch (error) {
      throw CatalogFailure.fromException(error);
    }
  }
}
