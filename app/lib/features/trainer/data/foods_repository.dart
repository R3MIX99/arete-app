import 'package:supabase_flutter/supabase_flutter.dart';

import '../domain/food.dart';
import '../domain/food_category.dart';
import '../domain/food_substitute.dart';
import 'catalog_failure.dart';

/// Acceso al catálogo de alimentos (genéricos + los del entrenador) y a
/// las categorías de referencia. Las políticas de Row Level Security ya
/// devuelven solo lo que corresponde; no hace falta repetir el filtro
/// acá.
class FoodsRepository {
  const FoodsRepository(this._client);

  final SupabaseClient _client;

  static const String _fields =
      'id, trainer_id, food_category_id, name, calories_per_100g, '
      'protein_per_100g, carbs_per_100g, fat_per_100g, '
      'household_unit_name, household_unit_grams, food_categories(name)';

  Future<List<FoodCategory>> fetchCategories() async {
    try {
      final rows = await _client
          .from('food_categories')
          .select()
          .order('sort_order');
      return rows.map(FoodCategory.fromJson).toList();
    } catch (error) {
      throw CatalogFailure.fromException(error);
    }
  }

  Future<List<Food>> fetchFoods() async {
    try {
      final rows = await _client.from('foods').select(_fields).order('name');
      return rows.map(Food.fromJson).toList();
    } catch (error) {
      throw CatalogFailure.fromException(error);
    }
  }

  Future<Food> fetchFood(String id) async {
    try {
      final row =
          await _client.from('foods').select(_fields).eq('id', id).single();
      return Food.fromJson(row);
    } catch (error) {
      throw CatalogFailure.fromException(error);
    }
  }

  Future<Food> createFood({
    required String trainerId,
    required String foodCategoryId,
    required String name,
    required double caloriesPer100g,
    required double proteinPer100g,
    required double carbsPer100g,
    required double fatPer100g,
    String? householdUnitName,
    double? householdUnitGrams,
  }) async {
    try {
      final row = await _client
          .from('foods')
          .insert({
            'trainer_id': trainerId,
            'food_category_id': foodCategoryId,
            'name': name.trim(),
            'calories_per_100g': caloriesPer100g,
            'protein_per_100g': proteinPer100g,
            'carbs_per_100g': carbsPer100g,
            'fat_per_100g': fatPer100g,
            if (householdUnitName != null && householdUnitGrams != null) ...{
              'household_unit_name': householdUnitName.trim(),
              'household_unit_grams': householdUnitGrams,
            },
          })
          .select(_fields)
          .single();
      return Food.fromJson(row);
    } catch (error) {
      throw CatalogFailure.fromException(error);
    }
  }

  Future<void> deleteFood(String id) async {
    try {
      await _client.from('foods').delete().eq('id', id);
    } catch (error) {
      throw CatalogFailure.fromException(error);
    }
  }

  /// Sustitutos automáticos de la misma categoría, con la cantidad ya
  /// ajustada para acercarse al original. No requiere aprobación del
  /// entrenador: es la función que usará el cliente en la Fase 10.
  Future<List<FoodSubstitute>> fetchSubstitutes({
    required String foodId,
    required double quantityGrams,
    double tolerancePercent = 15,
  }) async {
    try {
      final rows = await _client.rpc<List<dynamic>>(
        'get_food_substitutes',
        params: {
          'p_food_id': foodId,
          'p_quantity_grams': quantityGrams,
          'p_tolerance_percent': tolerancePercent,
        },
      );
      return rows
          .map((row) => FoodSubstitute.fromJson(row as Map<String, dynamic>))
          .toList();
    } catch (error) {
      throw CatalogFailure.fromException(error);
    }
  }
}
