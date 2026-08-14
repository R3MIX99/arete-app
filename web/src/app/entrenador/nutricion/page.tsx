import { redirect } from "next/navigation";

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
  image_path: string | null;
  food_categories: { name: string; slug: string } | { name: string; slug: string }[] | null;
}

function one<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export default async function NutritionPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: dietPlans }, { data: foods }, { data: dishes }, { data: categories }, { data: favorites }] =
    await Promise.all([
      supabase
        .from("diet_plans")
        .select("id, name, goal_label, daily_calorie_target, created_at")
        .order("created_at", { ascending: false }),
      supabase
        .from("foods")
        .select(
          "id, name, food_category_id, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, household_unit_name, household_unit_grams, trainer_id, image_path, food_categories(name, slug)",
        )
        .order("name"),
      supabase
        .from("dishes")
        .select("id, name, description, meal_type, trainer_id, image_path")
        .order("name"),
      supabase.from("food_categories").select("id, slug, name, sort_order").order("sort_order"),
      supabase.from("food_favorites").select("food_id").eq("trainer_id", user.id),
    ]);

  const favoriteIds = new Set((favorites ?? []).map((f) => f.food_id as string));

  const foodOptions: FoodOption[] = ((foods ?? []) as FoodRow[]).map((f) => {
    const category = one(f.food_categories);
    return {
      id: f.id,
      name: f.name,
      food_category_id: f.food_category_id,
      category_name: category?.name ?? "",
      category_slug: category?.slug ?? "",
      calories_per_100g: f.calories_per_100g,
      protein_per_100g: f.protein_per_100g,
      carbs_per_100g: f.carbs_per_100g,
      fat_per_100g: f.fat_per_100g,
      household_unit_name: f.household_unit_name,
      household_unit_grams: f.household_unit_grams,
      trainer_id: f.trainer_id,
      image_path: f.image_path,
      is_favorite: favoriteIds.has(f.id),
    };
  });

  return (
    <NutritionShell
      trainerId={user.id}
      dietPlans={(dietPlans ?? []) as DietPlanSummary[]}
      foods={foodOptions}
      dishes={(dishes ?? []) as DishOption[]}
      categories={(categories ?? []) as FoodCategory[]}
    />
  );
}
