import { notFound, redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { DietPlanBuilder } from "@/components/trainer/diet-plan-builder";
import type {
  CommunityDishOption,
  CommunityFoodOption,
  DietPlanAssignmentSummary,
  DietPlanBlock,
  DishOption,
  FoodOption,
  MealItemInput,
  MealType,
} from "@/lib/types/nutrition";
import type { ClientProfile } from "@/lib/types/client";

interface FoodMacros {
  name: string;
  calories_per_100g: number;
  protein_per_100g: number;
  carbs_per_100g: number;
  fat_per_100g: number;
}

interface MealRow {
  id: string;
  block_id: string;
  order_index: number;
  dish_id: string | null;
  food_id: string | null;
  quantity_grams: number | null;
  dishes: { name: string } | { name: string }[] | null;
  foods: FoodMacros | FoodMacros[] | null;
}

interface DishIngredientRow {
  dish_id: string;
  quantity_grams: number;
  foods: FoodMacros | FoodMacros[] | null;
}

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
}

interface CommunityFoodRow extends FoodRow {
  profiles: { full_name: string } | { full_name: string }[] | null;
}

interface CommunityDishRow {
  id: string;
  name: string;
  description: string | null;
  meal_type: string;
  trainer_id: string | null;
  image_path: string | null;
  forked_from: string | null;
  profiles: { full_name: string } | { full_name: string }[] | null;
}

interface AssignmentRow {
  id: string;
  client_id: string;
  start_date: string;
  target_daily_calories: number | null;
  scale_factor: number;
  profiles: { full_name: string } | { full_name: string }[] | null;
}

function one<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export default async function DietPlanDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [
    { data: plan },
    { data: blocks },
    { data: meals },
    { data: foods },
    { data: dishes },
    { data: clients },
    { data: assignments },
    { data: communityFoodRows },
    { data: communityDishRows },
  ] = await Promise.all([
    supabase
      .from("diet_plans")
      .select("id, name, goal_label, daily_calorie_target")
      .eq("id", id)
      .single(),
    supabase
      .from("diet_plan_blocks")
      .select("id, name, order_index, image_path")
      .eq("diet_plan_id", id)
      .order("order_index"),
    supabase
      .from("diet_plan_meals")
      .select(
        "id, block_id, order_index, dish_id, food_id, quantity_grams, dishes(name), foods(name, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g)",
      )
      .eq("diet_plan_id", id)
      .order("order_index"),
    supabase
      .from("foods")
      .select(
        "id, name, food_category_id, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, household_unit_name, household_unit_grams, trainer_id, image_path, forked_from, food_categories(name, slug)",
      )
      // Solo mi catálogo (esenciales + lo mío) — lo de otros
      // entrenadores se agrega desde la pestaña Comunidad primero.
      .or(`trainer_id.is.null,trainer_id.eq.${user.id}`)
      .order("name"),
    supabase
      .from("dishes")
      .select("id, name, description, meal_type, trainer_id, image_path, forked_from")
      .or(`trainer_id.is.null,trainer_id.eq.${user.id}`)
      .order("name"),
    supabase
      .from("profiles")
      .select("id, full_name, email, phone, goal, health_notes, status, created_at")
      .eq("role", "client")
      .order("full_name"),
    supabase
      .from("diet_plan_assignments")
      .select(
        "id, client_id, start_date, target_daily_calories, scale_factor, profiles!diet_plan_assignments_client_id_fkey(full_name)",
      )
      .eq("diet_plan_id", id),
    // Sin filtrar por dueño — toda la comunidad, para poder agregar a
    // mi catálogo un alimento de otro entrenador desde el picker.
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
  ]);

  if (!plan) notFound();

  const mealRows = (meals ?? []) as MealRow[];
  const dishIds = Array.from(
    new Set(mealRows.map((m) => m.dish_id).filter((v): v is string => Boolean(v))),
  );

  const dishTotals = new Map<string, { calories: number; protein: number; carbs: number; fat: number }>();
  if (dishIds.length > 0) {
    const { data: dishIngredients } = await supabase
      .from("dish_ingredients")
      .select("dish_id, quantity_grams, foods(name, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g)")
      .in("dish_id", dishIds);
    for (const row of (dishIngredients ?? []) as DishIngredientRow[]) {
      const food = one(row.foods);
      if (!food) continue;
      const factor = row.quantity_grams / 100;
      const prev = dishTotals.get(row.dish_id) ?? { calories: 0, protein: 0, carbs: 0, fat: 0 };
      dishTotals.set(row.dish_id, {
        calories: prev.calories + food.calories_per_100g * factor,
        protein: prev.protein + food.protein_per_100g * factor,
        carbs: prev.carbs + food.carbs_per_100g * factor,
        fat: prev.fat + food.fat_per_100g * factor,
      });
    }
  }

  const mealItems: MealItemInput[] = mealRows.map((row) => {
    if (row.dish_id) {
      const totals = dishTotals.get(row.dish_id) ?? { calories: 0, protein: 0, carbs: 0, fat: 0 };
      return {
        id: row.id,
        block_id: row.block_id,
        order_index: row.order_index,
        dish_id: row.dish_id,
        dish_name: one(row.dishes)?.name ?? "Platillo",
        food_id: null,
        food_name: null,
        quantity_grams: null,
        calories: totals.calories,
        protein: totals.protein,
        carbs: totals.carbs,
        fat: totals.fat,
      };
    }
    const food = one(row.foods);
    const factor = (row.quantity_grams ?? 0) / 100;
    return {
      id: row.id,
      block_id: row.block_id,
      order_index: row.order_index,
      dish_id: null,
      dish_name: null,
      food_id: row.food_id,
      food_name: food?.name ?? "Alimento",
      quantity_grams: row.quantity_grams,
      calories: (food?.calories_per_100g ?? 0) * factor,
      protein: (food?.protein_per_100g ?? 0) * factor,
      carbs: (food?.carbs_per_100g ?? 0) * factor,
      fat: (food?.fat_per_100g ?? 0) * factor,
    };
  });

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
      is_favorite: false,
      forked_from: f.forked_from,
    };
  });

  const myFoodIds = new Set(foodOptions.map((f) => f.id));
  const myDishIds = new Set(((dishes ?? []) as DishOption[]).map((d) => d.id));
  const forkedFoodIds = new Set(
    foodOptions.filter((f) => f.trainer_id === user.id && f.forked_from).map((f) => f.forked_from!),
  );
  const forkedDishIds = new Set(
    ((dishes ?? []) as DishOption[])
      .filter((d) => d.trainer_id === user.id && d.forked_from)
      .map((d) => d.forked_from!),
  );

  const communityFoods: CommunityFoodOption[] = ((communityFoodRows ?? []) as CommunityFoodRow[]).map(
    (f) => {
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
        is_favorite: false,
        forked_from: f.forked_from,
        creator_name: f.trainer_id ? (one(f.profiles)?.full_name ?? "Entrenador") : "Aretia",
        in_my_catalog: myFoodIds.has(f.id) || forkedFoodIds.has(f.id),
      };
    },
  );

  const communityDishes: CommunityDishOption[] = ((communityDishRows ?? []) as CommunityDishRow[]).map(
    (d) => ({
      id: d.id,
      name: d.name,
      description: d.description,
      meal_type: d.meal_type as MealType,
      trainer_id: d.trainer_id,
      image_path: d.image_path,
      forked_from: d.forked_from,
      creator_name: d.trainer_id ? (one(d.profiles)?.full_name ?? "Entrenador") : "Aretia",
      in_my_catalog: myDishIds.has(d.id) || forkedDishIds.has(d.id),
    }),
  );

  const assignmentSummaries: DietPlanAssignmentSummary[] = ((assignments ?? []) as AssignmentRow[]).map(
    (a) => ({
      id: a.id,
      client_id: a.client_id,
      client_name: one(a.profiles)?.full_name ?? "Cliente",
      start_date: a.start_date,
      target_daily_calories: a.target_daily_calories,
      scale_factor: a.scale_factor,
    }),
  );

  return (
    <DietPlanBuilder
      trainerId={user.id}
      plan={plan}
      blocks={(blocks ?? []) as DietPlanBlock[]}
      mealItems={mealItems}
      foodCatalog={foodOptions}
      dishCatalog={(dishes ?? []) as DishOption[]}
      communityFoods={communityFoods}
      communityDishes={communityDishes}
      clients={(clients ?? []) as ClientProfile[]}
      assignments={assignmentSummaries}
    />
  );
}
