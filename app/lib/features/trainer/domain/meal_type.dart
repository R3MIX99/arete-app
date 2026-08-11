/// Comida del día a la que pertenece un platillo o un ítem de un plan de
/// alimentación. Refleja el enum `meal_type` de Supabase.
enum MealType {
  breakfast('breakfast', 'Desayuno'),
  lunch('lunch', 'Almuerzo'),
  dinner('dinner', 'Cena'),
  snack('snack', 'Snack');

  const MealType(this.raw, this.label);

  final String raw;
  final String label;

  static MealType fromRaw(String? raw) {
    for (final type in MealType.values) {
      if (type.raw == raw) return type;
    }
    return MealType.breakfast;
  }
}
