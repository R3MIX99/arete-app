import type {
  ClientNutritionBlock,
  ClientNutritionDirectFood,
  ClientNutritionFoodRef,
  ClientNutritionIngredient,
  ClientNutritionMealItem,
  ClientNutritionPlan,
  MealSubstitutionRow,
  NutritionTotals,
  ShoppingListItem,
} from "@/lib/types/client-nutrition";

/** "huevo mediano" × 3 → "huevos medianos" — heurística simple (no
 * plural real del español) que alcanza para los nombres de unidades
 * caseras del catálogo (sustantivo + adjetivo terminados en vocal). */
function pluralizeUnitName(name: string): string {
  return name
    .split(" ")
    .map((word) => (/[aeiouáéíóú]$/i.test(word) ? `${word}s` : `${word}es`))
    .join(" ");
}

function formatCount(count: number): string {
  return Number.isInteger(count) ? String(count) : count.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
}

/** "aprox. 3 huevos medianos" a partir de una cantidad en gramos y la
 * unidad casera del alimento — null si el alimento no tiene una unidad
 * casera definida. */
export function formatHouseholdEquivalence(
  quantityGrams: number,
  householdUnitName: string | null,
  householdUnitGrams: number | null,
): string | null {
  if (!householdUnitName || !householdUnitGrams || householdUnitGrams <= 0) return null;
  const count = Math.round((quantityGrams / householdUnitGrams) * 4) / 4;
  if (count <= 0) return null;
  const label = count === 1 ? householdUnitName : pluralizeUnitName(householdUnitName);
  return `aprox. ${formatCount(count)} ${label}`;
}

function zeroTotals(): NutritionTotals {
  return { calories: 0, protein: 0, carbs: 0, fat: 0 };
}

function addFoodToTotals(
  totals: NutritionTotals,
  food: { quantityGrams: number; caloriesPer100g: number; proteinPer100g: number; carbsPer100g: number; fatPer100g: number },
) {
  const factor = food.quantityGrams / 100;
  totals.calories += food.caloriesPer100g * factor;
  totals.protein += food.proteinPer100g * factor;
  totals.carbs += food.carbsPer100g * factor;
  totals.fat += food.fatPer100g * factor;
}

export function itemTotals(item: ClientNutritionMealItem): NutritionTotals {
  const totals = zeroTotals();
  if (item.kind === "food" && item.food) addFoodToTotals(totals, item.food);
  if (item.kind === "dish" && item.ingredients) {
    for (const ing of item.ingredients) addFoodToTotals(totals, ing);
  }
  return totals;
}

export function blockTotals(block: ClientNutritionBlock): NutritionTotals {
  const totals = zeroTotals();
  for (const item of block.items) {
    const t = itemTotals(item);
    totals.calories += t.calories;
    totals.protein += t.protein;
    totals.carbs += t.carbs;
    totals.fat += t.fat;
  }
  return totals;
}

export function planTotals(plan: ClientNutritionPlan): NutritionTotals {
  const totals = zeroTotals();
  for (const block of plan.blocks) {
    const t = blockTotals(block);
    totals.calories += t.calories;
    totals.protein += t.protein;
    totals.carbs += t.carbs;
    totals.fat += t.fat;
  }
  return totals;
}

export function roundTotals(totals: NutritionTotals): NutritionTotals {
  return {
    calories: Math.round(totals.calories),
    protein: Math.round(totals.protein),
    carbs: Math.round(totals.carbs),
    fat: Math.round(totals.fat),
  };
}

/**
 * Aplica las sustituciones vigentes de un día sobre la estructura base
 * del plan (que siempre trae los alimentos originales) — reemplaza el
 * alimento directo o el ingrediente puntual dentro de un platillo por su
 * sustituto, ajusta la cantidad, y marca isSubstituted para poder
 * mostrarlo distinto. El resto del platillo/comida queda intacto.
 */
export function applySubstitutions(
  plan: ClientNutritionPlan,
  substitutions: (MealSubstitutionRow & { substituteFood: ClientNutritionFoodRef | null })[],
): ClientNutritionPlan {
  if (substitutions.length === 0) return plan;

  const byDirectMeal = new Map<string, (typeof substitutions)[number]>();
  const byIngredient = new Map<string, (typeof substitutions)[number]>();
  for (const sub of substitutions) {
    if (sub.dishIngredientId) byIngredient.set(sub.dishIngredientId, sub);
    else byDirectMeal.set(sub.dietPlanMealId, sub);
  }

  function applyToFood<T extends ClientNutritionDirectFood | ClientNutritionIngredient>(
    food: T,
    sub: (typeof substitutions)[number] | undefined,
  ): T {
    if (!sub || !sub.substituteFood) return food;
    return {
      ...food,
      foodId: sub.substituteFood.foodId,
      name: sub.substituteFood.name,
      categorySlug: sub.substituteFood.categorySlug,
      caloriesPer100g: sub.substituteFood.caloriesPer100g,
      proteinPer100g: sub.substituteFood.proteinPer100g,
      carbsPer100g: sub.substituteFood.carbsPer100g,
      fatPer100g: sub.substituteFood.fatPer100g,
      householdUnitName: sub.substituteFood.householdUnitName,
      householdUnitGrams: sub.substituteFood.householdUnitGrams,
      quantityGrams: sub.quantityGrams,
      isSubstituted: true,
    };
  }

  return {
    ...plan,
    blocks: plan.blocks.map((block) => ({
      ...block,
      items: block.items.map((item) => {
        if (item.kind === "food" && item.food) {
          return { ...item, food: applyToFood(item.food, byDirectMeal.get(item.id)) };
        }
        if (item.kind === "dish" && item.ingredients) {
          return {
            ...item,
            ingredients: item.ingredients.map((ing) =>
              applyToFood(ing, byIngredient.get(ing.dishIngredientId)),
            ),
          };
        }
        return item;
      }),
    })),
  };
}

/**
 * Lista de compras de la semana: el plan se repite todos los días, así
 * que se suma cuánto de cada alimento hace falta EN UN DÍA (juntando
 * todas las apariciones del mismo alimento, sea suelto o como
 * ingrediente de un platillo) y se multiplica por los días — redondeado
 * siempre hacia arriba, mejor que sobre a que falte. Usa el plan base
 * (sin sustituciones del día), porque una sustitución es un ajuste
 * puntual de un día concreto, no un cambio permanente de la receta.
 */
export function buildWeeklyShoppingList(plan: ClientNutritionPlan, days = 7): ShoppingListItem[] {
  const totals = new Map<
    string,
    {
      name: string;
      categorySlug: string | null;
      dailyGrams: number;
      householdUnitName: string | null;
      householdUnitGrams: number | null;
    }
  >();

  function addFood(food: ClientNutritionFoodRef & { quantityGrams: number }) {
    if (!food.foodId) return;
    const prev = totals.get(food.foodId) ?? {
      name: food.name,
      categorySlug: food.categorySlug,
      dailyGrams: 0,
      householdUnitName: food.householdUnitName,
      householdUnitGrams: food.householdUnitGrams,
    };
    prev.dailyGrams += food.quantityGrams;
    totals.set(food.foodId, prev);
  }

  for (const block of plan.blocks) {
    for (const item of block.items) {
      if (item.kind === "food" && item.food) addFood(item.food);
      if (item.kind === "dish" && item.ingredients) {
        for (const ing of item.ingredients) addFood(ing);
      }
    }
  }

  return Array.from(totals.entries())
    .map(([foodId, t]) => {
      const totalGrams = Math.ceil(t.dailyGrams * days);
      const householdUnitQuantity =
        t.householdUnitGrams && t.householdUnitGrams > 0
          ? Math.ceil(totalGrams / t.householdUnitGrams)
          : null;
      return {
        foodId,
        name: t.name,
        categorySlug: t.categorySlug,
        totalGrams,
        householdUnitName: t.householdUnitName,
        householdUnitQuantity,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}
