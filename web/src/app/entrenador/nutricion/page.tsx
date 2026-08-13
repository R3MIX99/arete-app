import { createClient } from "@/lib/supabase/server";
import { NutritionShell } from "@/components/trainer/nutrition-shell";
import type { DietPlanSummary, DishOption, FoodCategory, FoodOption } from "@/lib/types/nutrition";

interface FoodRow {
  id: string;
  name: string;
  food_category_id: string;
  calories_per_100g: number;
  protein_per_100g: number;
  carbs_per_100g: number;
  fat_per_100g: number;
  household_unit_name: string | null;
  household_unit_grams: number | null;
  trainer_id: string | null;
  food_categories: { name: string } | { name: string }[] | null;
}

function one<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export default async function NutritionPage() {
  const supabase = await createClient();

  const [{ data: dietPlans }, { data: foods }, { data: dishes }, { data: categories }] =
    await Promise.all([
      supabase
        .from("diet_plans")
        .select("id, name, goal_label, daily_calorie_target, created_at")
        .order("created_at", { ascending: false }),
      supabase
        .from("foods")
        .select(
          "id, name, food_category_id, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, household_unit_name, household_unit_grams, trainer_id, food_categories(name)",
        )
        .order("name"),
      supabase
        .from("dishes")
        .select("id, name, description, meal_type, trainer_id")
        .order("name"),
      supabase.from("food_categories").select("id, slug, name, sort_order").order("sort_order"),
    ]);

  const foodOptions: FoodOption[] = ((foods ?? []) as FoodRow[]).map((f) => ({
    id: f.id,
    name: f.name,
    food_category_id: f.food_category_id,
    category_name: one(f.food_categories)?.name ?? "",
    calories_per_100g: f.calories_per_100g,
    protein_per_100g: f.protein_per_100g,
    carbs_per_100g: f.carbs_per_100g,
    fat_per_100g: f.fat_per_100g,
    household_unit_name: f.household_unit_name,
    household_unit_grams: f.household_unit_grams,
    trainer_id: f.trainer_id,
  }));

  return (
    <NutritionShell
      dietPlans={(dietPlans ?? []) as DietPlanSummary[]}
      foods={foodOptions}
      dishes={(dishes ?? []) as DishOption[]}
      categories={(categories ?? []) as FoodCategory[]}
    />
  );
}
