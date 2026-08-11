import 'package:supabase_flutter/supabase_flutter.dart';

import '../domain/assignment_override.dart';
import '../domain/client_assignment.dart';
import 'catalog_failure.dart';

const String _summaryFields =
    '*, profiles!client_assignments_client_id_fkey(full_name, email), '
    'programs(name), routines(name)';

/// Acceso a las asignaciones de programas/rutinas a clientes y a los
/// ajustes puntuales que reemplazan una rutina de un día concreto sin
/// tocar la plantilla del programa.
class AssignmentsRepository {
  const AssignmentsRepository(this._client);

  final SupabaseClient _client;

  Future<List<AssignmentSummary>> fetchAssignmentsForProgram(
    String programId,
  ) async {
    try {
      final rows = await _client
          .from('client_assignments')
          .select(_summaryFields)
          .eq('program_id', programId)
          .order('created_at', ascending: false);
      return rows.map(AssignmentSummary.fromJson).toList();
    } catch (error) {
      throw CatalogFailure.fromException(error);
    }
  }

  Future<List<AssignmentSummary>> fetchAssignmentsForRoutine(
    String routineId,
  ) async {
    try {
      final rows = await _client
          .from('client_assignments')
          .select(_summaryFields)
          .eq('routine_id', routineId)
          .order('created_at', ascending: false);
      return rows.map(AssignmentSummary.fromJson).toList();
    } catch (error) {
      throw CatalogFailure.fromException(error);
    }
  }

  /// La asignación más reciente de un cliente (programa o rutina suelta),
  /// para mostrar "qué tiene asignado ahora" en su ficha.
  Future<AssignmentSummary?> fetchLatestAssignmentForClient(
    String clientId,
  ) async {
    try {
      final rows = await _client
          .from('client_assignments')
          .select(_summaryFields)
          .eq('client_id', clientId)
          .order('start_date', ascending: false)
          .limit(1);
      if (rows.isEmpty) return null;
      return AssignmentSummary.fromJson(rows.first);
    } catch (error) {
      throw CatalogFailure.fromException(error);
    }
  }

  /// Asigna un programa a varios clientes de una vez, todos con la misma
  /// fecha de inicio. Devuelve cuántas asignaciones se crearon
  /// exitosamente; un cliente que ya tenía este mismo programa asignado
  /// no se duplica silenciosamente, se informa aparte.
  Future<AssignmentBatchResult> assignProgramToClients({
    required String trainerId,
    required List<String> clientIds,
    required String programId,
    required DateTime startDate,
  }) {
    return _assignToClients(
      trainerId: trainerId,
      clientIds: clientIds,
      startDate: startDate,
      payload: {'program_id': programId},
    );
  }

  Future<AssignmentBatchResult> assignRoutineToClients({
    required String trainerId,
    required List<String> clientIds,
    required String routineId,
    required DateTime startDate,
  }) {
    return _assignToClients(
      trainerId: trainerId,
      clientIds: clientIds,
      startDate: startDate,
      payload: {'routine_id': routineId},
    );
  }

  Future<AssignmentBatchResult> _assignToClients({
    required String trainerId,
    required List<String> clientIds,
    required DateTime startDate,
    required Map<String, dynamic> payload,
  }) async {
    var succeeded = 0;
    final failedClientIds = <String>[];
    final dateOnly =
        '${startDate.year.toString().padLeft(4, '0')}-'
        '${startDate.month.toString().padLeft(2, '0')}-'
        '${startDate.day.toString().padLeft(2, '0')}';

    for (final clientId in clientIds) {
      try {
        await _client.from('client_assignments').insert({
          'trainer_id': trainerId,
          'client_id': clientId,
          'start_date': dateOnly,
          ...payload,
        });
        succeeded++;
      } catch (_) {
        failedClientIds.add(clientId);
      }
    }

    return AssignmentBatchResult(
      succeeded: succeeded,
      failedCount: failedClientIds.length,
    );
  }

  Future<void> deleteAssignment(String assignmentId) async {
    try {
      await _client.from('client_assignments').delete().eq('id', assignmentId);
    } catch (error) {
      throw CatalogFailure.fromException(error);
    }
  }

  Future<List<AssignmentOverride>> fetchOverridesForAssignment(
    String assignmentId,
  ) async {
    try {
      final rows = await _client
          .from('assignment_overrides')
          .select('*, routines(*)')
          .eq('assignment_id', assignmentId);
      return rows.map(AssignmentOverride.fromJson).toList();
    } catch (error) {
      throw CatalogFailure.fromException(error);
    }
  }

  /// Reemplaza (o crea, si todavía no existía) el ajuste puntual de una
  /// rutina de un día del programa para esta asignación en particular.
  Future<void> setOverride({
    required String assignmentId,
    required String programRoutineId,
    required String routineId,
  }) async {
    try {
      await _client.from('assignment_overrides').upsert(
        {
          'assignment_id': assignmentId,
          'program_routine_id': programRoutineId,
          'routine_id': routineId,
        },
        onConflict: 'assignment_id,program_routine_id',
      );
    } catch (error) {
      throw CatalogFailure.fromException(error);
    }
  }

  Future<void> removeOverride(String overrideId) async {
    try {
      await _client.from('assignment_overrides').delete().eq('id', overrideId);
    } catch (error) {
      throw CatalogFailure.fromException(error);
    }
  }
}

/// Resultado de asignar un programa/rutina a varios clientes a la vez.
class AssignmentBatchResult {
  const AssignmentBatchResult({required this.succeeded, required this.failedCount});

  final int succeeded;
  final int failedCount;

  bool get hasFailures => failedCount > 0;
}
