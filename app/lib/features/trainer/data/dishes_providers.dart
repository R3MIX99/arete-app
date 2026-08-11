import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/config/supabase_provider.dart';
import '../domain/dish.dart';
import 'dishes_repository.dart';

final dishesRepositoryProvider = Provider<DishesRepository>((ref) {
  return DishesRepository(ref.watch(supabaseClientProvider));
});

final dishesProvider = FutureProvider<List<Dish>>((ref) {
  return ref.watch(dishesRepositoryProvider).fetchDishes();
});

final dishDetailProvider = FutureProvider.family<DishDetail, String>((
  ref,
  id,
) {
  ref.watch(dishesProvider);
  return ref.watch(dishesRepositoryProvider).fetchDishDetail(id);
});

final dishSearchQueryProvider = StateProvider<String>((ref) => '');

final filteredDishesProvider = Provider<AsyncValue<List<Dish>>>((ref) {
  final dishes = ref.watch(dishesProvider);
  final query = ref.watch(dishSearchQueryProvider).trim().toLowerCase();

  return dishes.whenData((list) {
    if (query.isEmpty) return list;
    return list.where((d) => d.name.toLowerCase().contains(query)).toList();
  });
});
