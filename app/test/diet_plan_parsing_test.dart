// El constructor de planes depende de que DietPlanDetail.fromJson entienda
// la forma anidada de
// `diet_plans?select=*,diet_plan_meals(*,dishes(*,dish_ingredients(*,foods(*))),foods(*))`.
// Este fixture combina un platillo y dos alimentos sueltos, capturado al
// verificar el módulo de nutrición contra el proyecto de Supabase (plan
// "Plan definición 1800 kcal").

import 'package:flutter_test/flutter_test.dart';

import 'package:arete/features/trainer/domain/diet_plan.dart';
import 'package:arete/features/trainer/domain/meal_type.dart';

final _huevoJson = {
  'id': 'huevo-id',
  'trainer_id': null,
  'food_category_id': 'protein-id',
  'name': 'Huevo',
  'calories_per_100g': 155,
  'protein_per_100g': 13,
  'carbs_per_100g': 1.1,
  'fat_per_100g': 11,
  'household_unit_name': 'huevo mediano',
  'household_unit_grams': 50,
};

final _avenaJson = {
  'id': 'avena-id',
  'trainer_id': null,
  'food_category_id': 'carb-id',
  'name': 'Avena en hojuelas (cruda)',
  'calories_per_100g': 389,
  'protein_per_100g': 16.9,
  'carbs_per_100g': 66.3,
  'fat_per_100g': 6.9,
  'household_unit_name': 'taza',
  'household_unit_grams': 90,
};

void main() {
  test(
    'DietPlanDetail.fromJson agrupa por comida y suma platillos + alimentos sueltos',
    () {
      final json = {
        'id': 'a3f3ac23-def3-48c8-8bb8-eb2f65982879',
        'trainer_id': '0f2d5347-ecaf-46c9-967f-6be579272774',
        'name': 'Plan definición 1800 kcal',
        'goal_label': 'Déficit calórico alto en proteína',
        'daily_calorie_target': 1800,
        'created_at': '2026-08-11T23:01:33.475548+00:00',
        'diet_plan_meals': [
          {
            'id': 'meal-breakfast',
            'diet_plan_id': 'a3f3ac23-def3-48c8-8bb8-eb2f65982879',
            'meal_type': 'breakfast',
            'order_index': 0,
            'dish_id': 'dish-id',
            'food_id': null,
            'quantity_grams': null,
            'dishes': {
              'id': 'dish-id',
              'trainer_id': '0f2d5347-ecaf-46c9-967f-6be579272774',
              'food_category_id': null,
              'name': 'Huevos con avena',
              'description': null,
              'meal_type': 'breakfast',
              'created_at': '2026-08-11T23:00:49Z',
              'dish_ingredients': [
                {
                  'id': 'ing-huevo',
                  'dish_id': 'dish-id',
                  'food_id': 'huevo-id',
                  'quantity_grams': 120,
                  'order_index': 0,
                  'foods': _huevoJson,
                },
                {
                  'id': 'ing-avena',
                  'dish_id': 'dish-id',
                  'food_id': 'avena-id',
                  'quantity_grams': 45,
                  'order_index': 1,
                  'foods': _avenaJson,
                },
              ],
            },
            'foods': null,
          },
          {
            'id': 'meal-lunch-2',
            'diet_plan_id': 'a3f3ac23-def3-48c8-8bb8-eb2f65982879',
            'meal_type': 'lunch',
            'order_index': 1,
            'dish_id': null,
            'food_id': 'arroz-id',
            'quantity_grams': 150,
            'dishes': null,
            'foods': {
              'id': 'arroz-id',
              'trainer_id': null,
              'food_category_id': 'carb-id',
              'name': 'Arroz blanco cocido',
              'calories_per_100g': 130,
              'protein_per_100g': 2.7,
              'carbs_per_100g': 28,
              'fat_per_100g': 0.3,
              'household_unit_name': 'taza',
              'household_unit_grams': 158,
            },
          },
          {
            'id': 'meal-lunch-1',
            'diet_plan_id': 'a3f3ac23-def3-48c8-8bb8-eb2f65982879',
            'meal_type': 'lunch',
            'order_index': 0,
            'dish_id': null,
            'food_id': 'pollo-id',
            'quantity_grams': 150,
            'dishes': null,
            'foods': {
              'id': 'pollo-id',
              'trainer_id': null,
              'food_category_id': 'protein-id',
              'name': 'Pechuga de pollo',
              'calories_per_100g': 165,
              'protein_per_100g': 31,
              'carbs_per_100g': 0,
              'fat_per_100g': 3.6,
              'household_unit_name': 'pechuga mediana',
              'household_unit_grams': 120,
            },
          },
        ],
      };

      final detail = DietPlanDetail.fromJson(json);

      expect(detail.plan.name, 'Plan definición 1800 kcal');
      expect(detail.plan.dailyCalorieTarget, 1800);
      expect(detail.items, hasLength(3));

      final breakfast = detail.itemsFor(MealType.breakfast);
      expect(breakfast, hasLength(1));
      expect(breakfast.single.isDish, isTrue);
      expect(breakfast.single.displayName, 'Huevos con avena');

      final lunch = detail.itemsFor(MealType.lunch);
      expect(lunch, hasLength(2));
      // Ordenados por order_index dentro de la comida: pollo (0) antes
      // que arroz (1), aunque llegaron al revés en el JSON.
      expect(lunch[0].displayName, 'Pechuga de pollo');
      expect(lunch[1].displayName, 'Arroz blanco cocido');

      // Totales verificados contra la respuesta real de Supabase.
      expect(detail.totalCalories, closeTo(804, 1));
      expect(detail.totalProtein, closeTo(73.8, 0.1));
    },
  );
}
