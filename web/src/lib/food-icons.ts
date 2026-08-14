import {
  Apple,
  Bean,
  Beef,
  Coffee,
  Cookie,
  CupSoda,
  Droplet,
  Milk,
  Moon,
  Salad,
  Soup,
  Wheat,
  type LucideIcon,
} from "lucide-react";

import type { MealType } from "@/lib/types/nutrition";

/**
 * Ícono personalizado por categoría de alimento — antes todos los
 * alimentos usaban el mismo ícono de fruta sin importar su categoría.
 * Se indexa por el `slug` de `food_categories` (ver migración
 * `20260710000000_food_categories.sql` y semillas relacionadas).
 */
export const FOOD_CATEGORY_ICONS: Record<string, LucideIcon> = {
  protein: Beef,
  legume: Bean,
  carbohydrate: Wheat,
  vegetable: Salad,
  fruit: Apple,
  fat: Droplet,
  dairy: Milk,
  beverage: CupSoda,
};

export function foodCategoryIcon(categorySlug: string | null | undefined): LucideIcon {
  return (categorySlug && FOOD_CATEGORY_ICONS[categorySlug]) || Apple;
}

export const MEAL_TYPE_ICONS: Record<MealType, LucideIcon> = {
  breakfast: Coffee,
  lunch: Soup,
  dinner: Moon,
  snack: Cookie,
};

export function mealTypeIcon(mealType: MealType): LucideIcon {
  return MEAL_TYPE_ICONS[mealType] ?? Soup;
}
