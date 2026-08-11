import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/config/supabase_provider.dart';
import '../domain/food.dart';
import '../domain/food_category.dart';
import '../domain/food_substitute.dart';
import 'foods_repository.dart';

final foodsRepositoryProvider = Provider<FoodsRepository>((ref) {
  return FoodsRepository(ref.watch(supabaseClientProvider));
});

final foodCategoriesProvider = FutureProvider<List<FoodCategory>>((ref) {
  return ref.watch(foodsRepositoryProvider).fetchCategories();
});

/// Catálogo completo: genérico + el propio del entrenador. El filtrado
/// (buscador, categoría) se hace en la app, igual que en la biblioteca de
/// ejercicios: un catálogo de decenas de alimentos no necesita ida y
/// vuelta al servidor por cada tecla.
final foodsProvider = FutureProvider<List<Food>>((ref) {
  return ref.watch(foodsRepositoryProvider).fetchFoods();
});

final foodDetailProvider = FutureProvider.family<Food, String>((ref, id) {
  ref.watch(foodsProvider);
  return ref.watch(foodsRepositoryProvider).fetchFood(id);
});

final foodSearchQueryProvider = StateProvider<String>((ref) => '');

/// Filtro por categoría. `null` significa "todas".
final foodCategoryFilterProvider = StateProvider<String?>((ref) => null);

final filteredFoodsProvider = Provider<AsyncValue<List<Food>>>((ref) {
  final foods = ref.watch(foodsProvider);
  final query = ref.watch(foodSearchQueryProvider).trim().toLowerCase();
  final categoryId = ref.watch(foodCategoryFilterProvider);

  return foods.whenData((list) {
    return list.where((food) {
      if (categoryId != null && food.foodCategoryId != categoryId) {
        return false;
      }
      if (query.isEmpty) return true;
      return food.name.toLowerCase().contains(query);
    }).toList();
  });
});

final hasActiveFoodFiltersProvider = Provider<bool>((ref) {
  return ref.watch(foodSearchQueryProvider).trim().isNotEmpty ||
      ref.watch(foodCategoryFilterProvider) != null;
});

/// Sustitutos automáticos para un alimento y cantidad dados. Family con
/// un record para no crear un provider nuevo por cada gramaje: dos
/// llamadas con los mismos parámetros comparten resultado.
final foodSubstitutesProvider = FutureProvider.family<
    List<FoodSubstitute>,
    ({String foodId, double quantityGrams})>((ref, args) {
  return ref.watch(foodsRepositoryProvider).fetchSubstitutes(
        foodId: args.foodId,
        quantityGrams: args.quantityGrams,
      );
});
