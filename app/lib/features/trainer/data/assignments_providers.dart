import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/config/supabase_provider.dart';
import '../domain/assignment_override.dart';
import '../domain/client_assignment.dart';
import 'assignments_repository.dart';

final assignmentsRepositoryProvider = Provider<AssignmentsRepository>((ref) {
  return AssignmentsRepository(ref.watch(supabaseClientProvider));
});

final assignmentsForProgramProvider =
    FutureProvider.family<List<AssignmentSummary>, String>((ref, programId) {
  return ref
      .watch(assignmentsRepositoryProvider)
      .fetchAssignmentsForProgram(programId);
});

final assignmentsForRoutineProvider =
    FutureProvider.family<List<AssignmentSummary>, String>((ref, routineId) {
  return ref
      .watch(assignmentsRepositoryProvider)
      .fetchAssignmentsForRoutine(routineId);
});

final latestAssignmentForClientProvider =
    FutureProvider.family<AssignmentSummary?, String>((ref, clientId) {
  return ref
      .watch(assignmentsRepositoryProvider)
      .fetchLatestAssignmentForClient(clientId);
});

final overridesForAssignmentProvider =
    FutureProvider.family<List<AssignmentOverride>, String>((ref, assignmentId) {
  return ref
      .watch(assignmentsRepositoryProvider)
      .fetchOverridesForAssignment(assignmentId);
});
