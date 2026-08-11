import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/config/supabase_provider.dart';
import '../domain/diet_plan.dart';
import 'diet_plans_repository.dart';

final dietPlansRepositoryProvider = Provider<DietPlansRepository>((ref) {
  return DietPlansRepository(ref.watch(supabaseClientProvider));
});

final dietPlansProvider = FutureProvider<List<DietPlan>>((ref) {
  return ref.watch(dietPlansRepositoryProvider).fetchPlans();
});

final dietPlanDetailProvider = FutureProvider.family<DietPlanDetail, String>((
  ref,
  id,
) {
  ref.watch(dietPlansProvider);
  return ref.watch(dietPlansRepositoryProvider).fetchPlanDetail(id);
});

final dietPlanSearchQueryProvider = StateProvider<String>((ref) => '');

final filteredDietPlansProvider = Provider<AsyncValue<List<DietPlan>>>((ref) {
  final plans = ref.watch(dietPlansProvider);
  final query = ref.watch(dietPlanSearchQueryProvider).trim().toLowerCase();

  return plans.whenData((list) {
    if (query.isEmpty) return list;
    return list.where((p) => p.name.toLowerCase().contains(query)).toList();
  });
});
