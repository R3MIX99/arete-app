import { notFound } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { LibraryFoodForm } from "@/components/superadmin/library-food-form";
import type { FoodCategory, FoodOption } from "@/lib/types/nutrition";

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
  trainer_id: string | null;
  food_categories: { name: string; slug: string } | { name: string; slug: string }[] | null;
}

function one<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export default async function LibraryFoodDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: food }, { data: categories }] = await Promise.all([
    supabase
      .from("foods")
      .select(
        "id, name, food_category_id, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, household_unit_name, household_unit_grams, image_path, trainer_id, food_categories(name, slug)",
      )
      .eq("id", id)
      .is("trainer_id", null)
      .maybeSingle(),
    supabase.from("food_categories").select("id, slug, name, sort_order").order("sort_order"),
  ]);

  if (!food) notFound();

  const row = food as unknown as FoodRow;
  const category = one(row.food_categories);
  const foodOption: FoodOption = {
    id: row.id,
    name: row.name,
    food_category_id: row.food_category_id,
    category_name: category?.name ?? "",
    category_slug: category?.slug ?? "",
    calories_per_100g: row.calories_per_100g,
    protein_per_100g: row.protein_per_100g,
    carbs_per_100g: row.carbs_per_100g,
    fat_per_100g: row.fat_per_100g,
    household_unit_name: row.household_unit_name,
    household_unit_grams: row.household_unit_grams,
    trainer_id: null,
    image_path: row.image_path,
    is_favorite: false,
    forked_from: null,
  };

  return (
    <LibraryFoodForm
      mode="edit"
      food={foodOption}
      categories={(categories ?? []) as FoodCategory[]}
    />
  );
}
