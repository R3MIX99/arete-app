import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  ClientNutritionBlock,
  ClientNutritionDirectFood,
  ClientNutritionIngredient,
  ClientNutritionMealItem,
  ClientNutritionPlan,
  MealSubstitutionRow,
} from "@/lib/types/client-nutrition";

interface FoodRow {
  id: string;
  name: string;
  calories_per_100g: number;
  protein_per_100g: number;
  carbs_per_100g: number;
  fat_per_100g: number;
  household_unit_name: string | null;
  household_unit_grams: number | null;
  food_categories: { slug: string } | { slug: string }[] | null;
}

interface BlockRow {
  id: string;
  name: string;
  order_index: number;
}

interface MealRow {
  id: string;
  order_index: number;
  block_id: string;
  dish_id: string | null;
  food_id: string | null;
  quantity_grams: number | null;
  dishes: { name: string } | { name: string }[] | null;
  foods: FoodRow | FoodRow[] | null;
}

interface DishIngredientRow {
  id: string;
  dish_id: string;
  order_index: number;
  quantity_grams: number;
  foods: FoodRow | FoodRow[] | null;
}

function one<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function toFoodRef(row: FoodRow) {
  return {
    foodId: row.id,
    name: row.name,
    categorySlug: one(row.food_categories)?.slug ?? null,
    caloriesPer100g: row.calories_per_100g,
    proteinPer100g: row.protein_per_100g,
    carbsPer100g: row.carbs_per_100g,
    fatPer100g: row.fat_per_100g,
    householdUnitName: row.household_unit_name,
    householdUnitGrams: row.household_unit_grams,
  };
}

/** Busca la asignación de plan nutricional vigente para una fecha dada
 * — la más reciente cuya fecha de inicio ya pasó (no hay fecha de fin;
 * una asignación aplica todos los días hasta que empieza otra). */
export async function fetchActiveDietAssignment(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>,
  clientId: string,
  forDate: string = todayIso(),
) {
  const { data } = await supabase
    .from("diet_plan_assignments")
    .select("id, diet_plan_id, scale_factor, trainer_id")
    .eq("client_id", clientId)
    .lte("start_date", forDate)
    .order("start_date", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data as { id: string; diet_plan_id: string; scale_factor: number; trainer_id: string } | null;
}

/** Arma la estructura completa (bloques → comidas → platillo/alimento,
 * con macros e ids ya listos) de un plan nutricional asignado, con las
 * cantidades ya multiplicadas por el scale_factor del cliente. No
 * depende de la fecha: la sustitución de un día concreto se aplica
 * encima de esta estructura del lado del cliente. */
export async function fetchClientNutritionPlan(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>,
  assignment: { id: string; diet_plan_id: string; scale_factor: number },
): Promise<ClientNutritionPlan | null> {
  const foodSelect =
    "id, name, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, household_unit_name, household_unit_grams, food_categories(slug)";

  const [{ data: plan }, { data: blockRows }, { data: mealRows }] = await Promise.all([
    supabase.from("diet_plans").select("id, name").eq("id", assignment.diet_plan_id).maybeSingle(),
    supabase
      .from("diet_plan_blocks")
      .select("id, name, order_index")
      .eq("diet_plan_id", assignment.diet_plan_id)
      .order("order_index"),
    supabase
      .from("diet_plan_meals")
      .select(`id, order_index, block_id, dish_id, food_id, quantity_grams, dishes(name), foods(${foodSelect})`)
      .eq("diet_plan_id", assignment.diet_plan_id)
      .order("order_index"),
  ]);

  if (!plan) return null;

  const meals = (mealRows ?? []) as MealRow[];
  const dishIds = Array.from(new Set(meals.filter((m) => m.dish_id).map((m) => m.dish_id as string)));

  const { data: ingredientRows } = dishIds.length
    ? await supabase
        .from("dish_ingredients")
        .select(`id, dish_id, order_index, quantity_grams, foods(${foodSelect})`)
        .in("dish_id", dishIds)
        .order("order_index")
    : { data: [] };

  const ingredientsByDish = new Map<string, DishIngredientRow[]>();
  for (const row of (ingredientRows ?? []) as DishIngredientRow[]) {
    const list = ingredientsByDish.get(row.dish_id) ?? [];
    list.push(row);
    ingredientsByDish.set(row.dish_id, list);
  }

  const scale = assignment.scale_factor;
  const itemsByBlock = new Map<string, ClientNutritionMealItem[]>();
  for (const meal of meals) {
    let item: ClientNutritionMealItem;
    if (meal.dish_id) {
      const ingredientRowsForDish = ingredientsByDish.get(meal.dish_id) ?? [];
      const ingredients: ClientNutritionIngredient[] = ingredientRowsForDish.map((ing) => {
        const food = one(ing.foods);
        const ref = food ? toFoodRef(food) : null;
        return {
          dishIngredientId: ing.id,
          quantityGrams: ing.quantity_grams * scale,
          originalFoodId: food?.id ?? "",
          isSubstituted: false,
          foodId: ref?.foodId ?? "",
          name: ref?.name ?? "Ingrediente",
          categorySlug: ref?.categorySlug ?? null,
          caloriesPer100g: ref?.caloriesPer100g ?? 0,
          proteinPer100g: ref?.proteinPer100g ?? 0,
          carbsPer100g: ref?.carbsPer100g ?? 0,
          fatPer100g: ref?.fatPer100g ?? 0,
          householdUnitName: ref?.householdUnitName ?? null,
          householdUnitGrams: ref?.householdUnitGrams ?? null,
        };
      });
      item = {
        id: meal.id,
        kind: "dish",
        dishName: one(meal.dishes)?.name ?? "Platillo",
        food: null,
        ingredients,
      };
    } else {
      const food = one(meal.foods);
      const ref = food ? toFoodRef(food) : null;
      const directFood: ClientNutritionDirectFood = {
        quantityGrams: (meal.quantity_grams ?? 0) * scale,
        originalFoodId: food?.id ?? "",
        isSubstituted: false,
        foodId: ref?.foodId ?? "",
        name: ref?.name ?? "Alimento",
        categorySlug: ref?.categorySlug ?? null,
        caloriesPer100g: ref?.caloriesPer100g ?? 0,
        proteinPer100g: ref?.proteinPer100g ?? 0,
        carbsPer100g: ref?.carbsPer100g ?? 0,
        fatPer100g: ref?.fatPer100g ?? 0,
        householdUnitName: ref?.householdUnitName ?? null,
        householdUnitGrams: ref?.householdUnitGrams ?? null,
      };
      item = { id: meal.id, kind: "food", dishName: null, food: directFood, ingredients: null };
    }
    const list = itemsByBlock.get(meal.block_id) ?? [];
    list.push(item);
    itemsByBlock.set(meal.block_id, list);
  }

  const blocks: ClientNutritionBlock[] = ((blockRows ?? []) as BlockRow[]).map((b) => ({
    id: b.id,
    name: b.name,
    orderIndex: b.order_index,
    items: itemsByBlock.get(b.id) ?? [],
  }));

  return {
    assignmentId: assignment.id,
    planId: plan.id as string,
    planName: plan.name as string,
    scaleFactor: scale,
    blocks,
  };
}

export async function fetchSubstitutionsForDate(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>,
  clientId: string,
  date: string,
): Promise<(MealSubstitutionRow & { substituteFood: ReturnType<typeof toFoodRef> | null })[]> {
  const foodSelect =
    "id, name, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, household_unit_name, household_unit_grams, food_categories(slug)";
  const { data } = await supabase
    .from("client_meal_substitutions")
    .select(
      `id, substitution_date, diet_plan_meal_id, dish_ingredient_id, original_food_id, substitute_food_id, quantity_grams, foods!client_meal_substitutions_substitute_food_id_fkey(${foodSelect})`,
    )
    .eq("client_id", clientId)
    .eq("substitution_date", date);

  return ((data ?? []) as Array<{
    id: string;
    substitution_date: string;
    diet_plan_meal_id: string;
    dish_ingredient_id: string | null;
    original_food_id: string;
    substitute_food_id: string;
    quantity_grams: number;
    foods: FoodRow | FoodRow[] | null;
  }>).map((r) => {
    const food = one(r.foods);
    return {
      id: r.id,
      substitutionDate: r.substitution_date,
      dietPlanMealId: r.diet_plan_meal_id,
      dishIngredientId: r.dish_ingredient_id,
      originalFoodId: r.original_food_id,
      substituteFoodId: r.substitute_food_id,
      quantityGrams: r.quantity_grams,
      substituteFood: food ? toFoodRef(food) : null,
    };
  });
}
