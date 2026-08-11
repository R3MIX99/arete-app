import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/config/supabase_provider.dart';
import '../domain/routine.dart';
import '../domain/routine_exercise.dart';
import 'routines_repository.dart';

final routinesRepositoryProvider = Provider<RoutinesRepository>((ref) {
  return RoutinesRepository(ref.watch(supabaseClientProvider));
});

final routinesProvider = FutureProvider<List<Routine>>((ref) {
  return ref.watch(routinesRepositoryProvider).fetchRoutines();
});

/// Rutina completa (ejercicios y series) que se está armando o editando.
/// Depende de [routinesProvider] para refrescarse cuando cambia algo desde
/// otra pantalla (por ejemplo, tras duplicar).
final routineDetailProvider = FutureProvider.family<RoutineDetail, String>((
  ref,
  routineId,
) {
  ref.watch(routinesProvider);
  return ref.watch(routinesRepositoryProvider).fetchRoutineDetail(routineId);
});

final routineSearchQueryProvider = StateProvider<String>((ref) => '');

final filteredRoutinesProvider = Provider<AsyncValue<List<Routine>>>((ref) {
  final routines = ref.watch(routinesProvider);
  final query = ref.watch(routineSearchQueryProvider).trim().toLowerCase();

  return routines.whenData((list) {
    if (query.isEmpty) return list;
    return list.where((r) => r.name.toLowerCase().contains(query)).toList();
  });
});
