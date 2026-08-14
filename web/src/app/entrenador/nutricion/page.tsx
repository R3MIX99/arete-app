import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { NutritionShell } from "@/components/trainer/nutrition-shell";
import type {
  CommunityDishOption,
  CommunityFoodOption,
  DietPlanSummary,
  DishOption,
  FoodCategory,
  FoodOption,
} from "@/lib/types/nutrition";

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
  forked_from: string | null;
  food_categories: { name: string; slug: string } | { name: string; slug: string }[] | null;
  profiles: { full_name: string } | { full_name: string }[] | null;
}

interface DishRow {
  id: string;
  name: string;
  description: string | null;
  meal_type: string;
  trainer_id: string | null;
  image_path: string | null;
  forked_from: string | null;
  profiles: { full_name: string } | { full_name: string }[] | null;
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
          "id, name, food_category_id, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, household_unit_name, household_unit_grams, trainer_id, image_path, forked_from, food_categories(name, slug), profiles!foods_trainer_id_fkey(full_name)",
        )
        .order("name"),
      supabase
        .from("dishes")
        .select(
          "id, name, description, meal_type, trainer_id, image_path, forked_from, profiles!dishes_trainer_id_fkey(full_name)",
        )
        .order("name"),
      supabase.from("food_categories").select("id, slug, name, sort_order").order("sort_order"),
      supabase.from("food_favorites").select("food_id").eq("trainer_id", user.id),
    ]);

  const favoriteIds = new Set((favorites ?? []).map((f) => f.food_id as string));
  const allFoodRows = (foods ?? []) as FoodRow[];
  const allDishRows = (dishes ?? []) as DishRow[];

  // Alimentos ya copiados a mi catálogo (por id de origen), para marcar
  // en la pestaña Comunidad qué ya tengo agregado.
  const forkedFoodIds = new Set(
    allFoodRows.filter((f) => f.trainer_id === user.id && f.forked_from).map((f) => f.forked_from!),
  );
  const forkedDishIds = new Set(
    allDishRows.filter((d) => d.trainer_id === user.id && d.forked_from).map((d) => d.forked_from!),
  );

  const toFoodOption = (f: FoodRow): FoodOption => {
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
      forked_from: f.forked_from,
    };
  };

  const toDishOption = (d: DishRow): DishOption => ({
    id: d.id,
    name: d.name,
    description: d.description,
    meal_type: d.meal_type as DishOption["meal_type"],
    trainer_id: d.trainer_id,
    image_path: d.image_path,
    forked_from: d.forked_from,
  });

  const myFoods: FoodOption[] = allFoodRows
    .filter((f) => !f.trainer_id || f.trainer_id === user.id)
    .map(toFoodOption);

  const myDishes: DishOption[] = allDishRows
    .filter((d) => !d.trainer_id || d.trainer_id === user.id)
    .map(toDishOption);

  const communityFoods: CommunityFoodOption[] = allFoodRows.map((f) => ({
    ...toFoodOption(f),
    creator_name: f.trainer_id ? (one(f.profiles)?.full_name ?? "Entrenador") : "Areté",
    in_my_catalog: !f.trainer_id || f.trainer_id === user.id || forkedFoodIds.has(f.id),
  }));

  const communityDishes: CommunityDishOption[] = allDishRows.map((d) => ({
    ...toDishOption(d),
    creator_name: d.trainer_id ? (one(d.profiles)?.full_name ?? "Entrenador") : "Areté",
    in_my_catalog: !d.trainer_id || d.trainer_id === user.id || forkedDishIds.has(d.id),
  }));

  return (
    <NutritionShell
      trainerId={user.id}
      dietPlans={(dietPlans ?? []) as DietPlanSummary[]}
      foods={myFoods}
      dishes={myDishes}
      communityFoods={communityFoods}
      communityDishes={communityDishes}
      categories={(categories ?? []) as FoodCategory[]}
    />
  );
}
