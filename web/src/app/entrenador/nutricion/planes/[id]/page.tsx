import { notFound, redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { DietPlanBuilder } from "@/components/trainer/diet-plan-builder";
import type {
  DietPlanAssignmentSummary,
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
  meal_type: MealType;
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
  food_categories: { name: string } | { name: string }[] | null;
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
    { data: meals },
    { data: foods },
    { data: dishes },
    { data: clients },
    { data: assignments },
  ] = await Promise.all([
    supabase
      .from("diet_plans")
      .select("id, name, goal_label, daily_calorie_target")
      .eq("id", id)
      .single(),
    supabase
      .from("diet_plan_meals")
      .select(
        "id, meal_type, order_index, dish_id, food_id, quantity_grams, dishes(name), foods(name, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g)",
      )
      .eq("diet_plan_id", id)
      .order("meal_type")
      .order("order_index"),
    supabase
      .from("foods")
      .select(
        "id, name, food_category_id, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, household_unit_name, household_unit_grams, trainer_id, food_categories(name)",
      )
      .order("name"),
    supabase.from("dishes").select("id, name, description, meal_type, trainer_id").order("name"),
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
        meal_type: row.meal_type,
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
      meal_type: row.meal_type,
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
      mealItems={mealItems}
      foodCatalog={foodOptions}
      dishCatalog={(dishes ?? []) as DishOption[]}
      clients={(clients ?? []) as ClientProfile[]}
      assignments={assignmentSummaries}
    />
  );
}
