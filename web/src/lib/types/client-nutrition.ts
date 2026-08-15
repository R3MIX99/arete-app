export interface ClientNutritionFoodRef {
  foodId: string;
  name: string;
  categorySlug: string | null;
  caloriesPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
  householdUnitName: string | null;
  householdUnitGrams: number | null;
}

export interface ClientNutritionIngredient extends ClientNutritionFoodRef {
  dishIngredientId: string;
  quantityGrams: number;
  originalFoodId: string;
  isSubstituted: boolean;
}

export interface ClientNutritionDirectFood extends ClientNutritionFoodRef {
  quantityGrams: number;
  originalFoodId: string;
  isSubstituted: boolean;
}

export interface ClientNutritionMealItem {
  id: string;
  kind: "dish" | "food";
  dishName: string | null;
  dishImagePath: string | null;
  food: ClientNutritionDirectFood | null;
  ingredients: ClientNutritionIngredient[] | null;
}

export interface ClientNutritionBlock {
  id: string;
  name: string;
  orderIndex: number;
  imagePath: string | null;
  items: ClientNutritionMealItem[];
}

export interface ClientNutritionPlan {
  assignmentId: string;
  planId: string;
  planName: string;
  scaleFactor: number;
  blocks: ClientNutritionBlock[];
}

export interface MealSubstitutionRow {
  id: string;
  substitutionDate: string;
  dietPlanMealId: string;
  dishIngredientId: string | null;
  originalFoodId: string;
  substituteFoodId: string;
  quantityGrams: number;
}

export interface FoodSubstituteOption {
  foodId: string;
  name: string;
  quantityGrams: number;
  householdUnitName: string | null;
  householdUnitGrams: number | null;
  householdUnitQuantity: number | null;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface NutritionTotals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}
