import { createClient } from "@/lib/supabase/server";
import { LibraryShell } from "@/components/superadmin/library-shell";
import type { ExerciseSummary } from "@/lib/types/exercise";
import type { DishOption, FoodOption } from "@/lib/types/nutrition";

interface ExerciseRow {
  id: string;
  name: string;
  muscle_group: ExerciseSummary["muscle_group"];
  equipment: ExerciseSummary["equipment"];
  video_url: string | null;
  image_path: string | null;
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

interface DishRow {
  id: string;
  name: string;
  description: string | null;
  meal_type: DishOption["meal_type"];
  image_path: string | null;
}

function one<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

/** Biblioteca de Areté (Fase de biblioteca del superadmin): solo lo
 * global (trainer_id IS NULL) — no la biblioteca de ningún entrenador
 * en particular. */
export default async function SuperadminLibraryPage() {
  const supabase = await createClient();

  const [{ data: exerciseRows }, { data: foodRows }, { data: dishRows }] = await Promise.all([
    supabase
      .from("exercises")
      .select("id, name, muscle_group, equipment, video_url, image_path")
      .is("trainer_id", null)
      .order("name"),
    supabase
      .from("foods")
      .select(
        "id, name, food_category_id, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, household_unit_name, household_unit_grams, image_path, food_categories(name, slug)",
      )
      .is("trainer_id", null)
      .order("name"),
    supabase
      .from("dishes")
      .select("id, name, description, meal_type, image_path")
      .is("trainer_id", null)
      .order("name"),
  ]);

  const exercises: ExerciseSummary[] = ((exerciseRows ?? []) as ExerciseRow[]).map((r) => ({
    id: r.id,
    name: r.name,
    muscle_group: r.muscle_group,
    equipment: r.equipment,
    video_url: r.video_url,
    image_path: r.image_path,
    trainer_id: null,
    forked_from: null,
  }));

  const foods: FoodOption[] = ((foodRows ?? []) as FoodRow[]).map((r) => {
    const category = one(r.food_categories);
    return {
      id: r.id,
      name: r.name,
      food_category_id: r.food_category_id,
      category_name: category?.name ?? "",
      category_slug: category?.slug ?? "",
      calories_per_100g: r.calories_per_100g,
      protein_per_100g: r.protein_per_100g,
      carbs_per_100g: r.carbs_per_100g,
      fat_per_100g: r.fat_per_100g,
      household_unit_name: r.household_unit_name,
      household_unit_grams: r.household_unit_grams,
      trainer_id: null,
      image_path: r.image_path,
      is_favorite: false,
      forked_from: null,
    };
  });

  const dishes: DishOption[] = ((dishRows ?? []) as DishRow[]).map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description,
    meal_type: r.meal_type,
    trainer_id: null,
    image_path: r.image_path,
    forked_from: null,
  }));

  return <LibraryShell exercises={exercises} foods={foods} dishes={dishes} />;
}
