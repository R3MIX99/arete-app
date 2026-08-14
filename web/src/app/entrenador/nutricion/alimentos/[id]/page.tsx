import { notFound, redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { NewFoodForm } from "@/components/trainer/new-food-form";
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
  trainer_id: string | null;
  image_path: string | null;
  forked_from: string | null;
  food_categories: { name: string; slug: string } | { name: string; slug: string }[] | null;
}

function one<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export default async function EditFoodPage({
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

  const [{ data: food }, { data: categories }] = await Promise.all([
    supabase
      .from("foods")
      .select(
        "id, name, food_category_id, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, household_unit_name, household_unit_grams, trainer_id, image_path, forked_from, food_categories(name, slug)",
      )
      .eq("id", id)
      .single(),
    supabase.from("food_categories").select("id, slug, name, sort_order").order("sort_order"),
  ]);

  if (!food) notFound();

  const row = food as FoodRow;
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
    trainer_id: row.trainer_id,
    image_path: row.image_path,
    is_favorite: false,
    forked_from: row.forked_from,
  };

  return (
    <NewFoodForm
      mode="edit"
      food={foodOption}
      trainerId={user.id}
      categories={(categories ?? []) as FoodCategory[]}
    />
  );
}
