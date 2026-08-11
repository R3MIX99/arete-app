// El constructor de platillos depende de que DishDetail.fromJson entienda
// la forma anidada de `dishes?select=*,dish_ingredients(*,foods(*))`. Este
// fixture es una respuesta real, capturada al verificar el módulo de
// nutrición contra el proyecto de Supabase (platillo "Huevos con avena").

import 'package:flutter_test/flutter_test.dart';

import 'package:arete/features/trainer/domain/dish.dart';

void main() {
  test(
    'DishDetail.fromJson arma el platillo, ordena sus ingredientes y suma los totales',
    () {
      final json = {
        'id': '4ea0e521-9130-4ddb-bcb7-2756acafe7e9',
        'trainer_id': '0f2d5347-ecaf-46c9-967f-6be579272774',
        'food_category_id': null,
        'name': 'Huevos con avena',
        'description': 'Desayuno alto en proteina',
        'meal_type': 'breakfast',
        'created_at': '2026-08-11T23:00:49.001827+00:00',
        'dish_ingredients': [
          // Fuera de orden a propósito, para confirmar que fromJson
          // ordena por order_index.
          {
            'id': 'ing-avena',
            'dish_id': '4ea0e521-9130-4ddb-bcb7-2756acafe7e9',
            'food_id': 'avena-id',
            'quantity_grams': 45,
            'order_index': 1,
            'created_at': '2026-08-11T23:00:55Z',
            'foods': {
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
            },
          },
          {
            'id': 'ing-huevo',
            'dish_id': '4ea0e521-9130-4ddb-bcb7-2756acafe7e9',
            'food_id': 'huevo-id',
            'quantity_grams': 120,
            'order_index': 0,
            'created_at': '2026-08-11T23:00:52Z',
            'foods': {
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
            },
          },
        ],
      };

      final detail = DishDetail.fromJson(json);

      expect(detail.dish.name, 'Huevos con avena');
      expect(detail.ingredients, hasLength(2));
      // Ordenados por order_index: huevo (0) antes que avena (1).
      expect(detail.ingredients[0].food.name, 'Huevo');
      expect(detail.ingredients[1].food.name, 'Avena en hojuelas (cruda)');

      expect(detail.ingredients[0].householdMeasure, '2 y 1/2 huevos medianos');
      expect(detail.ingredients[1].householdMeasure, '1/2 taza');

      // Totales verificados contra la respuesta real de Supabase.
      expect(detail.totalCalories, closeTo(361, 0.5));
      expect(detail.totalProtein, closeTo(23.2, 0.1));
    },
  );
}
