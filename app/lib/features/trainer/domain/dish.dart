import 'food.dart';
import 'meal_type.dart';

/// Platillo compuesto (p. ej. "huevos con verduras"), armado a partir de
/// alimentos individuales del catálogo. Igual que en [Food], `trainerId`
/// nulo significa genérico.
class Dish {
  const Dish({
    required this.id,
    required this.name,
    required this.mealType,
    required this.createdAt,
    this.trainerId,
    this.foodCategoryId,
    this.description,
  });

  final String id;
  final String? trainerId;
  final String? foodCategoryId;
  final String name;
  final String? description;
  final MealType mealType;
  final DateTime createdAt;

  bool get isGeneric => trainerId == null;

  factory Dish.fromJson(Map<String, dynamic> json) {
    return Dish(
      id: json['id'] as String,
      trainerId: json['trainer_id'] as String?,
      foodCategoryId: json['food_category_id'] as String?,
      name: json['name'] as String,
      description: json['description'] as String?,
      mealType: MealType.fromRaw(json['meal_type'] as String?),
      createdAt: DateTime.parse(json['created_at'] as String),
    );
  }
}

/// Un ingrediente del platillo: qué alimento, cuántos gramos. La medida
/// casera no se guarda; se calcula con [Food.householdMeasureFor].
class DishIngredient {
  const DishIngredient({
    required this.id,
    required this.dishId,
    required this.quantityGrams,
    required this.orderIndex,
    required this.food,
  });

  final String id;
  final String dishId;
  final double quantityGrams;
  final int orderIndex;
  final Food food;

  double get calories => food.caloriesFor(quantityGrams);
  double get protein => food.proteinFor(quantityGrams);
  double get carbs => food.carbsFor(quantityGrams);
  double get fat => food.fatFor(quantityGrams);
  String? get householdMeasure => food.householdMeasureFor(quantityGrams);

  factory DishIngredient.fromJson(Map<String, dynamic> json) {
    return DishIngredient(
      id: json['id'] as String,
      dishId: json['dish_id'] as String,
      quantityGrams: (json['quantity_grams'] as num).toDouble(),
      orderIndex: json['order_index'] as int? ?? 0,
      food: Food.fromJson(json['foods'] as Map<String, dynamic>),
    );
  }
}

/// Un platillo junto con sus ingredientes ya en orden, y los totales
/// nutricionales calculados (suma de sus ingredientes).
class DishDetail {
  const DishDetail({required this.dish, required this.ingredients});

  final Dish dish;
  final List<DishIngredient> ingredients;

  double get totalCalories =>
      ingredients.fold(0, (sum, i) => sum + i.calories);
  double get totalProtein =>
      ingredients.fold(0, (sum, i) => sum + i.protein);
  double get totalCarbs => ingredients.fold(0, (sum, i) => sum + i.carbs);
  double get totalFat => ingredients.fold(0, (sum, i) => sum + i.fat);

  factory DishDetail.fromJson(Map<String, dynamic> json) {
    final ingredientsJson = json['dish_ingredients'] as List<dynamic>? ?? [];
    final ingredients = ingredientsJson
        .map((row) => DishIngredient.fromJson(row as Map<String, dynamic>))
        .toList()
      ..sort((a, b) => a.orderIndex.compareTo(b.orderIndex));
    return DishDetail(dish: Dish.fromJson(json), ingredients: ingredients);
  }
}
