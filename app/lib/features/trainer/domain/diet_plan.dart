import 'dish.dart';
import 'food.dart';
import 'meal_type.dart';

/// Plantilla reutilizable de plan de alimentación (no asigna clientes
/// directamente; eso vive en [DietPlanAssignment]).
class DietPlan {
  const DietPlan({
    required this.id,
    required this.trainerId,
    required this.name,
    required this.createdAt,
    this.goalLabel,
    this.dailyCalorieTarget,
  });

  final String id;
  final String trainerId;
  final String name;

  /// Objetivo del plan en texto libre, p. ej. "Déficit calórico alto en
  /// proteína".
  final String? goalLabel;
  final double? dailyCalorieTarget;
  final DateTime createdAt;

  factory DietPlan.fromJson(Map<String, dynamic> json) {
    return DietPlan(
      id: json['id'] as String,
      trainerId: json['trainer_id'] as String,
      name: json['name'] as String,
      goalLabel: json['goal_label'] as String?,
      dailyCalorieTarget: (json['daily_calorie_target'] as num?)?.toDouble(),
      createdAt: DateTime.parse(json['created_at'] as String),
    );
  }
}

/// Un platillo o un alimento individual dentro de una comida del día del
/// plan. Es uno o el otro, nunca los dos (igual que en la base de datos).
class DietPlanMealItem {
  const DietPlanMealItem({
    required this.id,
    required this.dietPlanId,
    required this.mealType,
    required this.orderIndex,
    this.dish,
    this.food,
    this.quantityGrams,
  });

  final String id;
  final String dietPlanId;
  final MealType mealType;
  final int orderIndex;

  /// Con sus ingredientes ya cargados, para poder sumar sus totales.
  final DishDetail? dish;

  /// Solo cuando el ítem es un alimento suelto (no un platillo).
  final Food? food;
  final double? quantityGrams;

  bool get isDish => dish != null;

  String get displayName => isDish ? dish!.dish.name : food!.name;

  double get calories =>
      isDish ? dish!.totalCalories : food!.caloriesFor(quantityGrams!);
  double get protein =>
      isDish ? dish!.totalProtein : food!.proteinFor(quantityGrams!);
  double get carbs =>
      isDish ? dish!.totalCarbs : food!.carbsFor(quantityGrams!);
  double get fat => isDish ? dish!.totalFat : food!.fatFor(quantityGrams!);

  factory DietPlanMealItem.fromJson(Map<String, dynamic> json) {
    final dishJson = json['dishes'] as Map<String, dynamic>?;
    final foodJson = json['foods'] as Map<String, dynamic>?;
    return DietPlanMealItem(
      id: json['id'] as String,
      dietPlanId: json['diet_plan_id'] as String,
      mealType: MealType.fromRaw(json['meal_type'] as String?),
      orderIndex: json['order_index'] as int? ?? 0,
      dish: dishJson == null ? null : DishDetail.fromJson(dishJson),
      food: foodJson == null ? null : Food.fromJson(foodJson),
      quantityGrams: (json['quantity_grams'] as num?)?.toDouble(),
    );
  }
}

/// Un plan de alimentación junto con todos sus ítems, agrupables por
/// comida del día, y los totales nutricionales del día completo.
class DietPlanDetail {
  const DietPlanDetail({required this.plan, required this.items});

  final DietPlan plan;
  final List<DietPlanMealItem> items;

  double get totalCalories => items.fold(0, (sum, i) => sum + i.calories);
  double get totalProtein => items.fold(0, (sum, i) => sum + i.protein);
  double get totalCarbs => items.fold(0, (sum, i) => sum + i.carbs);
  double get totalFat => items.fold(0, (sum, i) => sum + i.fat);

  List<DietPlanMealItem> itemsFor(MealType mealType) => items
      .where((item) => item.mealType == mealType)
      .toList()
    ..sort((a, b) => a.orderIndex.compareTo(b.orderIndex));

  factory DietPlanDetail.fromJson(Map<String, dynamic> json) {
    final itemsJson = json['diet_plan_meals'] as List<dynamic>? ?? [];
    final items = itemsJson
        .map((row) => DietPlanMealItem.fromJson(row as Map<String, dynamic>))
        .toList();
    return DietPlanDetail(plan: DietPlan.fromJson(json), items: items);
  }
}
