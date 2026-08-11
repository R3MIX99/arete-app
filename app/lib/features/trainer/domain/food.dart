import '../../../core/utils/household_unit.dart';

/// Alimento individual del catálogo (no un platillo). Un `trainerId` nulo
/// significa que es genérico (disponible para todos los entrenadores);
/// con `trainerId`, es un alimento personalizado de ese entrenador.
class Food {
  const Food({
    required this.id,
    required this.foodCategoryId,
    required this.name,
    required this.caloriesPer100g,
    required this.proteinPer100g,
    required this.carbsPer100g,
    required this.fatPer100g,
    this.trainerId,
    this.categoryName,
    this.householdUnitName,
    this.householdUnitGrams,
  });

  final String id;
  final String? trainerId;
  final String foodCategoryId;

  /// Nombre de la categoría, cuando la consulta la trae unida
  /// (`food_categories(name)`). `null` si no se pidió el join.
  final String? categoryName;

  final String name;
  final double caloriesPer100g;
  final double proteinPer100g;
  final double carbsPer100g;
  final double fatPer100g;
  final String? householdUnitName;
  final double? householdUnitGrams;

  bool get isGeneric => trainerId == null;
  bool get hasHouseholdUnit => householdUnitName != null && householdUnitGrams != null;

  double caloriesFor(double grams) => caloriesPer100g * grams / 100;
  double proteinFor(double grams) => proteinPer100g * grams / 100;
  double carbsFor(double grams) => carbsPer100g * grams / 100;
  double fatFor(double grams) => fatPer100g * grams / 100;

  /// "4 huevos medianos" para `grams` de este alimento, o `null` si no
  /// tiene medida casera definida.
  String? householdMeasureFor(double grams) => formatHouseholdMeasure(
        grams: grams,
        unitName: householdUnitName,
        unitGrams: householdUnitGrams,
      );

  factory Food.fromJson(Map<String, dynamic> json) {
    final categoryJson = json['food_categories'] as Map<String, dynamic>?;
    return Food(
      id: json['id'] as String,
      trainerId: json['trainer_id'] as String?,
      foodCategoryId: json['food_category_id'] as String,
      categoryName: categoryJson?['name'] as String?,
      name: json['name'] as String,
      caloriesPer100g: (json['calories_per_100g'] as num).toDouble(),
      proteinPer100g: (json['protein_per_100g'] as num).toDouble(),
      carbsPer100g: (json['carbs_per_100g'] as num).toDouble(),
      fatPer100g: (json['fat_per_100g'] as num).toDouble(),
      householdUnitName: json['household_unit_name'] as String?,
      householdUnitGrams: (json['household_unit_grams'] as num?)?.toDouble(),
    );
  }
}
