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
  calories_per_100g: number;
  protein_per_100g: number;
  carbs_per_100g: number;
  fat_per_100g: number;
  household_unit_name: string | null;
  household_unit_grams: number | null;
  trainer_id: string | null;
}

export interface DishOption {
  id: string;
  name: string;
  description: string | null;
  meal_type: MealType;
  trainer_id: string | null;
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

export interface MealItemInput {
  id?: string;
  meal_type: MealType;
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
