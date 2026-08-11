import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/config/supabase_provider.dart';
import '../domain/progress_entry.dart';
import 'calendar_providers.dart';
import 'progress_repository.dart';

final progressRepositoryProvider = Provider<ProgressRepository>((ref) {
  return ProgressRepository(ref.watch(supabaseClientProvider));
});

final progressEntriesProvider =
    FutureProvider.family<List<ProgressEntry>, String>((ref, clientId) {
  return ref.watch(progressRepositoryProvider).fetchEntries(clientId);
});

/// Cumplimiento de rutinas del cliente en las últimas 4 semanas: qué
/// porcentaje de sus sesiones programadas registró como hechas. `null`
/// mientras carga o si no había sesiones programadas en ese período.
final complianceRateProvider = FutureProvider.family<double?, String>((
  ref,
  clientId,
) async {
  final assignments = await ref.watch(calendarAssignmentsProvider.future);
  final clientAssignments =
      assignments.where((a) => a.clientId == clientId).toList();
  final now = DateTime.now();
  final rangeStart = now.subtract(const Duration(days: 28));

  return ref.watch(progressRepositoryProvider).complianceRate(
        clientId: clientId,
        clientAssignments: clientAssignments,
        rangeStart: rangeStart,
        rangeEnd: now,
      );
});
