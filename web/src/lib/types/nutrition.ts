export type MealType = "breakfast" | "lunch" | "dinner" | "snack";

export interface FoodCategory {
  id: string;
  slug: string;
  name: string;
  sort_order: number;
}

export interface FoodOption {
  id: string;
  name: string;
  food_category_id: string;
  category_name: string;
  category_slug: string;
  calories_per_100g: number;
  protein_per_100g: number;
  carbs_per_100g: number;
  fat_per_100g: number;
  household_unit_name: string | null;
  household_unit_grams: number | null;
  trainer_id: string | null;
  image_path: string | null;
  is_favorite: boolean;
  // Del alimento (esencial o de otro entrenador) del que se copió éste,
  // si aplica. Ver migración 20260814150000_catalog_community_sharing.
  forked_from: string | null;
}

export interface DishOption {
  id: string;
  name: string;
  description: string | null;
  meal_type: MealType;
  trainer_id: string | null;
  image_path: string | null;
  forked_from: string | null;
}

/** Un alimento tal como aparece en la pestaña Comunidad: de cualquier
 * entrenador (o esencial de Aretia), con quién lo creó y si ya está en
 * el catálogo propio del entrenador que está viendo la lista. */
export interface CommunityFoodOption extends FoodOption {
  creator_name: string;
  in_my_catalog: boolean;
}

export interface CommunityDishOption extends DishOption {
  creator_name: string;
  in_my_catalog: boolean;
}

export interface DishIngredientInput {
  id?: string;
  food_id: string;
  food_name: string;
  quantity_grams: number;
  order_index: number;
  calories_per_100g: number;
  protein_per_100g: number;
  carbs_per_100g: number;
  fat_per_100g: number;
  household_unit_name: string | null;
  household_unit_grams: number | null;
}

export interface DietPlanSummary {
  id: string;
  name: string;
  goal_label: string | null;
  daily_calorie_target: number | null;
  created_at: string;
}

export interface DietPlanBlock {
  id: string;
  name: string;
  order_index: number;
  image_path: string | null;
}

export interface MealItemInput {
  id?: string;
  block_id: string;
  order_index: number;
  dish_id: string | null;
  dish_name: string | null;
  food_id: string | null;
  food_name: string | null;
  quantity_grams: number | null;
  // Macros for the item as a whole (dish totals, or food scaled to quantity_grams).
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface DietPlanAssignmentSummary {
  id: string;
  client_id: string;
  client_name: string;
  start_date: string;
  target_daily_calories: number | null;
  scale_factor: number;
}
