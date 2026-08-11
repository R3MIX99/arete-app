import 'package:supabase_flutter/supabase_flutter.dart';

import '../domain/diet_plan.dart';
import '../domain/meal_type.dart';
import 'catalog_failure.dart';

/// Acceso a los planes de alimentación (plantillas) del entrenador y a
/// las comidas que los componen.
class DietPlansRepository {
  const DietPlansRepository(this._client);

  final SupabaseClient _client;

  static const String _detailFields =
      '*, diet_plan_meals('
      '*, dishes(*, dish_ingredients(*, foods(*))), foods(*)'
      ')';

  Future<List<DietPlan>> fetchPlans() async {
    try {
      final rows = await _client
          .from('diet_plans')
          .select()
          .order('created_at', ascending: false);
      return rows.map(DietPlan.fromJson).toList();
    } catch (error) {
      throw CatalogFailure.fromException(error);
    }
  }

  Future<DietPlanDetail> fetchPlanDetail(String id) async {
    try {
      final row = await _client
          .from('diet_plans')
          .select(_detailFields)
          .eq('id', id)
          .single();
      return DietPlanDetail.fromJson(row);
    } catch (error) {
      throw CatalogFailure.fromException(error);
    }
  }

  Future<DietPlan> createPlan({
    required String trainerId,
    required String name,
    String? goalLabel,
    double? dailyCalorieTarget,
  }) async {
    try {
      final row = await _client
          .from('diet_plans')
          .insert({
            'trainer_id': trainerId,
            'name': name.trim(),
            if (goalLabel != null && goalLabel.trim().isNotEmpty)
              'goal_label': goalLabel.trim(),
            if (dailyCalorieTarget != null)
              'daily_calorie_target': dailyCalorieTarget,
          })
          .select()
          .single();
      return DietPlan.fromJson(row);
    } catch (error) {
      throw CatalogFailure.fromException(error);
    }
  }

  Future<void> updatePlan({
    required String planId,
    required String name,
    String? goalLabel,
    double? dailyCalorieTarget,
  }) async {
    try {
      await _client
          .from('diet_plans')
          .update({
            'name': name.trim(),
            'goal_label': (goalLabel == null || goalLabel.trim().isEmpty)
                ? null
                : goalLabel.trim(),
            'daily_calorie_target': dailyCalorieTarget,
          })
          .eq('id', planId);
    } catch (error) {
      throw CatalogFailure.fromException(error);
    }
  }

  Future<void> deletePlan(String id) async {
    try {
      await _client.from('diet_plans').delete().eq('id', id);
    } catch (error) {
      throw CatalogFailure.fromException(error);
    }
  }

  Future<DietPlanMealItem> addDishToMeal({
    required String dietPlanId,
    required MealType mealType,
    required String dishId,
    required int orderIndex,
  }) async {
    try {
      final row = await _client
          .from('diet_plan_meals')
          .insert({
            'diet_plan_id': dietPlanId,
            'meal_type': mealType.raw,
            'dish_id': dishId,
            'order_index': orderIndex,
          })
          .select('*, dishes(*, dish_ingredients(*, foods(*)))')
          .single();
      return DietPlanMealItem.fromJson(row);
    } catch (error) {
      throw CatalogFailure.fromException(error);
    }
  }

  Future<DietPlanMealItem> addFoodToMeal({
    required String dietPlanId,
    required MealType mealType,
    required String foodId,
    required double quantityGrams,
    required int orderIndex,
  }) async {
    try {
      final row = await _client
          .from('diet_plan_meals')
          .insert({
            'diet_plan_id': dietPlanId,
            'meal_type': mealType.raw,
            'food_id': foodId,
            'quantity_grams': quantityGrams,
            'order_index': orderIndex,
          })
          .select('*, foods(*)')
          .single();
      return DietPlanMealItem.fromJson(row);
    } catch (error) {
      throw CatalogFailure.fromException(error);
    }
  }

  Future<void> removeMealItem(String id) async {
    try {
      await _client.from('diet_plan_meals').delete().eq('id', id);
    } catch (error) {
      throw CatalogFailure.fromException(error);
    }
  }
}
