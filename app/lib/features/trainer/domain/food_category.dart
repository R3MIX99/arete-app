/// Categoría de un alimento (proteína, carbohidrato, etc.), reflejo de la
/// tabla `food_categories` de Supabase. Es la clave de la sustitución
/// automática: dos alimentos de la misma categoría se consideran
/// intercambiables entre sí.
class FoodCategory {
  const FoodCategory({
    required this.id,
    required this.slug,
    required this.name,
    required this.sortOrder,
  });

  final String id;
  final String slug;
  final String name;
  final int sortOrder;

  factory FoodCategory.fromJson(Map<String, dynamic> json) {
    return FoodCategory(
      id: json['id'] as String,
      slug: json['slug'] as String,
      name: json['name'] as String,
      sortOrder: json['sort_order'] as int? ?? 0,
    );
  }
}
