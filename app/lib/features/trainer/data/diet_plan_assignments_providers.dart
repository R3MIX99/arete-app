import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/config/supabase_provider.dart';
import '../domain/diet_plan_assignment.dart';
import 'diet_plan_assignments_repository.dart';

final dietPlanAssignmentsRepositoryProvider =
    Provider<DietPlanAssignmentsRepository>((ref) {
  return DietPlanAssignmentsRepository(ref.watch(supabaseClientProvider));
});

final assignmentsForDietPlanProvider =
    FutureProvider.family<List<DietPlanAssignmentSummary>, String>((
  ref,
  dietPlanId,
) {
  return ref
      .watch(dietPlanAssignmentsRepositoryProvider)
      .fetchAssignmentsForPlan(dietPlanId);
});

final latestDietPlanAssignmentForClientProvider =
    FutureProvider.family<DietPlanAssignmentSummary?, String>((
  ref,
  clientId,
) {
  return ref
      .watch(dietPlanAssignmentsRepositoryProvider)
      .fetchLatestAssignmentForClient(clientId);
});
