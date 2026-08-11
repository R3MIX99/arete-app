import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/config/supabase_provider.dart';
import '../domain/program.dart';
import '../domain/program_routine.dart';
import 'programs_repository.dart';

final programsRepositoryProvider = Provider<ProgramsRepository>((ref) {
  return ProgramsRepository(ref.watch(supabaseClientProvider));
});

final programsProvider = FutureProvider<List<Program>>((ref) {
  return ref.watch(programsRepositoryProvider).fetchPrograms();
});

final programDetailProvider = FutureProvider.family<ProgramDetail, String>((
  ref,
  programId,
) {
  ref.watch(programsProvider);
  return ref.watch(programsRepositoryProvider).fetchProgramDetail(programId);
});

final programSearchQueryProvider = StateProvider<String>((ref) => '');

final filteredProgramsProvider = Provider<AsyncValue<List<Program>>>((ref) {
  final programs = ref.watch(programsProvider);
  final query = ref.watch(programSearchQueryProvider).trim().toLowerCase();

  return programs.whenData((list) {
    if (query.isEmpty) return list;
    return list.where((p) => p.name.toLowerCase().contains(query)).toList();
  });
});
