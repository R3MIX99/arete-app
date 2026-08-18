import { notFound } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { LibraryDishBuilder } from "@/components/superadmin/library-dish-builder";
import type { DishIngredientInput, FoodOption, MealType } from "@/lib/types/nutrition";

interface FoodJoin {
  id: string;
  name: string;
  calories_per_100g: number;
  protein_per_100g: number;
  carbs_per_100g: number;
  fat_per_100g: number;
  household_unit_name: string | null;
  household_unit_grams: number | null;
}

interface IngredientRow {
  id: string;
  food_id: string;
  quantity_grams: number;
  order_index: number;
  foods: FoodJoin | FoodJoin[] | null;
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
  image_path: string | null;
  food_categories: { name: string; slug: string } | { name: string; slug: string }[] | null;
}

function one<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export default async function LibraryDishDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: dish }, { data: ingredients }, { data: foods }] = await Promise.all([
    supabase
      .from("dishes")
      .select("id, name, description, meal_type, image_path, trainer_id")
      .eq("id", id)
      .is("trainer_id", null)
      .maybeSingle(),
    supabase
      .from("dish_ingredients")
      .select(
        "id, food_id, quantity_grams, order_index, foods(id, name, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, household_unit_name, household_unit_grams)",
      )
      .eq("dish_id", id)
      .order("order_index"),
    supabase
      .from("foods")
      .select(
        "id, name, food_category_id, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, household_unit_name, household_unit_grams, image_path, food_categories(name, slug)",
      )
      // Los ingredientes de un platillo de Aretia salen del catálogo
      // global de Aretia, no del catálogo de ningún entrenador.
      .is("trainer_id", null)
      .order("name"),
  ]);

  if (!dish) notFound();

  const initialIngredients: DishIngredientInput[] = ((ingredients ?? []) as IngredientRow[]).map(
    (row) => {
      const food = one(row.foods);
      return {
        id: row.id,
        food_id: row.food_id,
        food_name: food?.name ?? "Alimento",
        quantity_grams: row.quantity_grams,
        order_index: row.order_index,
        calories_per_100g: food?.calories_per_100g ?? 0,
        protein_per_100g: food?.protein_per_100g ?? 0,
        carbs_per_100g: food?.carbs_per_100g ?? 0,
        fat_per_100g: food?.fat_per_100g ?? 0,
        household_unit_name: food?.household_unit_name ?? null,
        household_unit_grams: food?.household_unit_grams ?? null,
      };
    },
  );

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
      trainer_id: null,
      image_path: f.image_path,
      is_favorite: false,
      forked_from: null,
    };
  });

  return (
    <LibraryDishBuilder
      dish={{
        id: dish.id,
        name: dish.name,
        description: dish.description,
        meal_type: dish.meal_type as MealType,
        image_path: dish.image_path,
      }}
      initialIngredients={initialIngredients}
      foodCatalog={foodOptions}
    />
  );
}
