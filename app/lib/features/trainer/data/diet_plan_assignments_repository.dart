import 'package:supabase_flutter/supabase_flutter.dart';

import '../domain/diet_plan_assignment.dart';
import 'assignments_repository.dart' show AssignmentBatchResult;
import 'catalog_failure.dart';

const String _summaryFields =
    '*, profiles!diet_plan_assignments_client_id_fkey(full_name, email), '
    'diet_plans(name)';

/// Acceso a las asignaciones de planes de alimentación a clientes.
class DietPlanAssignmentsRepository {
  const DietPlanAssignmentsRepository(this._client);

  final SupabaseClient _client;

  Future<List<DietPlanAssignmentSummary>> fetchAssignmentsForPlan(
    String dietPlanId,
  ) async {
    try {
      final rows = await _client
          .from('diet_plan_assignments')
          .select(_summaryFields)
          .eq('diet_plan_id', dietPlanId)
          .order('created_at', ascending: false);
      return rows.map(DietPlanAssignmentSummary.fromJson).toList();
    } catch (error) {
      throw CatalogFailure.fromException(error);
    }
  }

  /// La asignación de dieta más reciente de un cliente, para mostrar "qué
  /// plan tiene ahora mismo" en su ficha.
  Future<DietPlanAssignmentSummary?> fetchLatestAssignmentForClient(
    String clientId,
  ) async {
    try {
      final rows = await _client
          .from('diet_plan_assignments')
          .select(_summaryFields)
          .eq('client_id', clientId)
          .order('start_date', ascending: false)
          .limit(1);
      if (rows.isEmpty) return null;
      return DietPlanAssignmentSummary.fromJson(rows.first);
    } catch (error) {
      throw CatalogFailure.fromException(error);
    }
  }

  /// Asigna un plan a varios clientes de una vez, todos con la misma
  /// fecha de inicio y el mismo factor de ajuste ya calculado (ver
  /// [DietPlanScaling] en la pantalla de asignación).
  Future<AssignmentBatchResult> assignPlanToClients({
    required String trainerId,
    required List<String> clientIds,
    required String dietPlanId,
    required DateTime startDate,
    double? targetDailyCalories,
    double scaleFactor = 1,
  }) async {
    var succeeded = 0;
    final failedClientIds = <String>[];
    final dateOnly =
        '${startDate.year.toString().padLeft(4, '0')}-'
        '${startDate.month.toString().padLeft(2, '0')}-'
        '${startDate.day.toString().padLeft(2, '0')}';

    for (final clientId in clientIds) {
      try {
        await _client.from('diet_plan_assignments').insert({
          'trainer_id': trainerId,
          'client_id': clientId,
          'diet_plan_id': dietPlanId,
          'start_date': dateOnly,
          'scale_factor': scaleFactor,
          if (targetDailyCalories != null)
            'target_daily_calories': targetDailyCalories,
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
      await _client
          .from('diet_plan_assignments')
          .delete()
          .eq('id', assignmentId);
    } catch (error) {
      throw CatalogFailure.fromException(error);
    }
  }
}
