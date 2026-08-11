/// Un sustituto propuesto para un alimento, devuelto por la función
/// `get_food_substitutes` de Supabase: mismo grupo de macros dentro de la
/// tolerancia pedida, con la cantidad ya ajustada para acercarse lo más
/// posible al original.
class FoodSubstitute {
  const FoodSubstitute({
    required this.foodId,
    required this.name,
    required this.quantityGrams,
    required this.calories,
    required this.protein,
    required this.carbs,
    required this.fat,
    this.householdUnitName,
    this.householdUnitGrams,
    this.householdUnitQuantity,
  });

  final String foodId;
  final String name;
  final double quantityGrams;
  final double calories;
  final double protein;
  final double carbs;
  final double fat;
  final String? householdUnitName;
  final double? householdUnitGrams;
  final double? householdUnitQuantity;

  factory FoodSubstitute.fromJson(Map<String, dynamic> json) {
    return FoodSubstitute(
      foodId: json['food_id'] as String,
      name: json['name'] as String,
      quantityGrams: (json['quantity_grams'] as num).toDouble(),
      calories: (json['calories'] as num).toDouble(),
      protein: (json['protein'] as num).toDouble(),
      carbs: (json['carbs'] as num).toDouble(),
      fat: (json['fat'] as num).toDouble(),
      householdUnitName: json['household_unit_name'] as String?,
      householdUnitGrams: (json['household_unit_grams'] as num?)?.toDouble(),
      householdUnitQuantity:
          (json['household_unit_quantity'] as num?)?.toDouble(),
    );
  }
}
