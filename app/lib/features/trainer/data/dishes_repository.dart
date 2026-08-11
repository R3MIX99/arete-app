import 'package:supabase_flutter/supabase_flutter.dart';

import '../domain/dish.dart';
import '../domain/meal_type.dart';
import 'catalog_failure.dart';

/// Acceso a los platillos (genéricos + los del entrenador) y a sus
/// ingredientes.
class DishesRepository {
  const DishesRepository(this._client);

  final SupabaseClient _client;

  static const String _detailFields =
      '*, dish_ingredients(*, foods(*, food_categories(name)))';

  Future<List<Dish>> fetchDishes() async {
    try {
      final rows = await _client.from('dishes').select().order('name');
      return rows.map(Dish.fromJson).toList();
    } catch (error) {
      throw CatalogFailure.fromException(error);
    }
  }

  Future<DishDetail> fetchDishDetail(String id) async {
    try {
      final row = await _client
          .from('dishes')
          .select(_detailFields)
          .eq('id', id)
          .single();
      return DishDetail.fromJson(row);
    } catch (error) {
      throw CatalogFailure.fromException(error);
    }
  }

  Future<Dish> createDish({
    required String trainerId,
    required String name,
    required MealType mealType,
    String? description,
  }) async {
    try {
      final row = await _client
          .from('dishes')
          .insert({
            'trainer_id': trainerId,
            'name': name.trim(),
            'meal_type': mealType.raw,
            if (description != null && description.trim().isNotEmpty)
              'description': description.trim(),
          })
          .select()
          .single();
      return Dish.fromJson(row);
    } catch (error) {
      throw CatalogFailure.fromException(error);
    }
  }

  Future<void> updateDish({
    required String dishId,
    required String name,
    required MealType mealType,
    String? description,
  }) async {
    try {
      await _client
          .from('dishes')
          .update({
            'name': name.trim(),
            'meal_type': mealType.raw,
            'description': (description == null || description.trim().isEmpty)
                ? null
                : description.trim(),
          })
          .eq('id', dishId);
    } catch (error) {
      throw CatalogFailure.fromException(error);
    }
  }

  Future<void> deleteDish(String id) async {
    try {
      await _client.from('dishes').delete().eq('id', id);
    } catch (error) {
      throw CatalogFailure.fromException(error);
    }
  }

  Future<DishIngredient> addIngredient({
    required String dishId,
    required String foodId,
    required double quantityGrams,
    required int orderIndex,
  }) async {
    try {
      final row = await _client
          .from('dish_ingredients')
          .insert({
            'dish_id': dishId,
            'food_id': foodId,
            'quantity_grams': quantityGrams,
            'order_index': orderIndex,
          })
          .select('*, foods(*, food_categories(name))')
          .single();
      return DishIngredient.fromJson(row);
    } catch (error) {
      throw CatalogFailure.fromException(error);
    }
  }

  Future<void> updateIngredientQuantity({
    required String ingredientId,
    required double quantityGrams,
  }) async {
    try {
      await _client
          .from('dish_ingredients')
          .update({'quantity_grams': quantityGrams})
          .eq('id', ingredientId);
    } catch (error) {
      throw CatalogFailure.fromException(error);
    }
  }

  Future<void> removeIngredient(String id) async {
    try {
      await _client.from('dish_ingredients').delete().eq('id', id);
    } catch (error) {
      throw CatalogFailure.fromException(error);
    }
  }
}
