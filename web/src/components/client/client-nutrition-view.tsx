"use client";

import * as React from "react";
import { Flame, Repeat } from "lucide-react";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import { foodCategoryIcon } from "@/lib/food-icons";
import {
  applySubstitutions,
  blockTotals,
  formatHouseholdEquivalence,
  planTotals,
  roundTotals,
} from "@/lib/client-nutrition-utils";
import type {
  ClientNutritionDirectFood,
  ClientNutritionFoodRef,
  ClientNutritionIngredient,
  ClientNutritionPlan,
  FoodSubstituteOption,
  MealSubstitutionRow,
} from "@/lib/types/client-nutrition";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { SubstituteFoodDialog } from "@/components/client/substitute-food-dialog";

type SubstitutionWithFood = MealSubstitutionRow & { substituteFood: ClientNutritionFoodRef | null };

interface SubstituteTarget {
  dietPlanMealId: string;
  dishIngredientId: string | null;
  originalFoodId: string;
  currentFoodId: string;
  currentQuantity: number;
  name: string;
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function weekDates(): string[] {
  const dates: string[] = [];
  const start = new Date();
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    dates.push(d.toISOString().slice(0, 10));
  }
  return dates;
}

function weekdayLabel(dateIso: string, index: number): string {
  const label = new Date(`${dateIso}T00:00:00`).toLocaleDateString("es-MX", {
    weekday: "long",
    day: "numeric",
    month: "short",
  });
  return index === 0 ? `Hoy · ${label}` : label.charAt(0).toUpperCase() + label.slice(1);
}

type DetailFood = ClientNutritionDirectFood | ClientNutritionIngredient;

function publicImageUrl(path: string): string {
  return createClient().storage.from("food-images").getPublicUrl(path).data.publicUrl;
}

export function ClientNutritionView({
  clientId,
  trainerId,
  plan,
  initialSubstitutions,
  upcomingStartDate,
}: {
  clientId: string;
  trainerId: string;
  plan: ClientNutritionPlan | null;
  initialSubstitutions: SubstitutionWithFood[];
  upcomingStartDate: string | null;
}) {
  const supabase = React.useMemo(() => createClient(), []);
  const today = React.useMemo(() => todayIso(), []);
  const [substitutions, setSubstitutions] = React.useState(initialSubstitutions);
  const [target, setTarget] = React.useState<SubstituteTarget | null>(null);
  const [applying, setApplying] = React.useState(false);
  const [detailFood, setDetailFood] = React.useState<DetailFood | null>(null);

  const effectivePlan = React.useMemo(
    () => (plan ? applySubstitutions(plan, substitutions) : null),
    [plan, substitutions],
  );

  async function handlePick(option: FoodSubstituteOption) {
    if (!target) return;
    setApplying(true);
    const supabase2 = supabase;

    let deleteQuery = supabase2
      .from("client_meal_substitutions")
      .delete()
      .eq("client_id", clientId)
      .eq("substitution_date", today)
      .eq("diet_plan_meal_id", target.dietPlanMealId);
    deleteQuery = target.dishIngredientId
      ? deleteQuery.eq("dish_ingredient_id", target.dishIngredientId)
      : deleteQuery.is("dish_ingredient_id", null);
    await deleteQuery;

    const { data, error } = await supabase2
      .from("client_meal_substitutions")
      .insert({
        client_id: clientId,
        trainer_id: trainerId,
        substitution_date: today,
        diet_plan_meal_id: target.dietPlanMealId,
        dish_ingredient_id: target.dishIngredientId,
        original_food_id: target.originalFoodId,
        substitute_food_id: option.foodId,
        quantity_grams: option.quantityGrams,
      })
      .select("id")
      .single();

    setApplying(false);
    if (error || !data) {
      toast.error("No se pudo aplicar la sustitución. Intenta de nuevo.");
      return;
    }

    const newRow: SubstitutionWithFood = {
      id: data.id,
      substitutionDate: today,
      dietPlanMealId: target.dietPlanMealId,
      dishIngredientId: target.dishIngredientId,
      originalFoodId: target.originalFoodId,
      substituteFoodId: option.foodId,
      quantityGrams: option.quantityGrams,
      substituteFood: {
        foodId: option.foodId,
        name: option.name,
        categorySlug: null,
        caloriesPer100g: option.calories / (option.quantityGrams / 100),
        proteinPer100g: option.protein / (option.quantityGrams / 100),
        carbsPer100g: option.carbs / (option.quantityGrams / 100),
        fatPer100g: option.fat / (option.quantityGrams / 100),
        householdUnitName: option.householdUnitName,
        householdUnitGrams: option.householdUnitGrams,
      },
    };
    setSubstitutions((prev) => [
      ...prev.filter(
        (s) =>
          !(
            s.dietPlanMealId === target.dietPlanMealId &&
            (s.dishIngredientId ?? null) === target.dishIngredientId
          ),
      ),
      newRow,
    ]);
    toast.success(`Sustituido por ${option.name}`);
    setTarget(null);
  }

  if (!plan || !effectivePlan) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-3 p-10 text-center">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Flame className="size-6" />
        </div>
        {upcomingStartDate ? (
          <>
            <p className="font-medium">Tu plan nutricional todavía no empieza</p>
            <p className="text-sm text-muted-foreground">
              Ya tienes uno asignado — arranca el{" "}
              {new Date(`${upcomingStartDate}T00:00:00`).toLocaleDateString("es-MX", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
              . Antes de esa fecha no hay nada que mostrar aquí.
            </p>
          </>
        ) : (
          <>
            <p className="font-medium">Todavía no tienes un plan nutricional asignado</p>
            <p className="text-sm text-muted-foreground">
              En cuanto tu entrenador te asigne uno, lo vas a ver aquí organizado por comida.
            </p>
          </>
        )}
      </div>
    );
  }

  const dayTotals = roundTotals(planTotals(effectivePlan));

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 p-4 pb-24 md:p-8">
      <div>
        <h1 className="text-xl font-semibold">{effectivePlan.planName}</h1>
      </div>

      <Tabs defaultValue="hoy">
        <TabsList>
          <TabsTrigger value="hoy">Hoy</TabsTrigger>
          <TabsTrigger value="semana">Semana</TabsTrigger>
        </TabsList>

        <TabsContent value="hoy" className="flex flex-col gap-4 pt-4">
          <Card>
            <CardContent className="flex items-center justify-around py-4 text-center">
              <div>
                <p className="text-lg font-bold tabular-nums">{dayTotals.calories}</p>
                <p className="text-[11px] text-muted-foreground uppercase">kcal</p>
              </div>
              <div>
                <p className="text-lg font-bold tabular-nums">{dayTotals.protein}g</p>
                <p className="text-[11px] text-muted-foreground uppercase">Proteína</p>
              </div>
              <div>
                <p className="text-lg font-bold tabular-nums">{dayTotals.carbs}g</p>
                <p className="text-[11px] text-muted-foreground uppercase">Carbs</p>
              </div>
              <div>
                <p className="text-lg font-bold tabular-nums">{dayTotals.fat}g</p>
                <p className="text-[11px] text-muted-foreground uppercase">Grasa</p>
              </div>
            </CardContent>
          </Card>

          {effectivePlan.blocks.map((block) => {
            const totals = roundTotals(blockTotals(block));
            return (
              <Card key={block.id}>
                <CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
                  <CardTitle className="text-sm">{block.name}</CardTitle>
                  <p className="text-xs tabular-nums text-muted-foreground">
                    {totals.calories} kcal · {totals.protein}g prot
                  </p>
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                  {block.imagePath && (
                    <div className="aspect-[4/3] w-full overflow-hidden rounded-lg border border-border">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={publicImageUrl(block.imagePath)}
                        alt={block.name}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  )}
                  {block.items.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Sin comidas en este bloque.</p>
                  ) : (
                    block.items.map((item) =>
                      item.kind === "food" && item.food ? (
                        <FoodRow
                          key={item.id}
                          food={item.food}
                          onSubstitute={() =>
                            setTarget({
                              dietPlanMealId: item.id,
                              dishIngredientId: null,
                              originalFoodId: item.food!.originalFoodId,
                              currentFoodId: item.food!.foodId,
                              currentQuantity: item.food!.quantityGrams,
                              name: item.food!.name,
                            })
                          }
                          onOpenDetail={() => setDetailFood(item.food)}
                        />
                      ) : (
                        <div key={item.id} className="flex flex-col gap-2 rounded-lg border px-3 py-2.5">
                          <p className="text-sm font-medium">{item.dishName}</p>
                          {item.dishImagePath && (
                            <div className="aspect-[4/3] w-full overflow-hidden rounded-lg">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={publicImageUrl(item.dishImagePath)}
                                alt={item.dishName ?? ""}
                                className="h-full w-full object-cover"
                              />
                            </div>
                          )}
                          <div className="flex flex-col gap-2">
                            {(item.ingredients ?? []).map((ing) => (
                              <FoodRow
                                key={ing.dishIngredientId}
                                food={ing}
                                nested
                                onSubstitute={() =>
                                  setTarget({
                                    dietPlanMealId: item.id,
                                    dishIngredientId: ing.dishIngredientId,
                                    originalFoodId: ing.originalFoodId,
                                    currentFoodId: ing.foodId,
                                    currentQuantity: ing.quantityGrams,
                                    name: ing.name,
                                  })
                                }
                                onOpenDetail={() => setDetailFood(ing)}
                              />
                            ))}
                          </div>
                        </div>
                      ),
                    )
                  )}
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>

        <TabsContent value="semana" className="flex flex-col gap-3 pt-4">
          {weekDates().map((date, index) => {
            // Solo "hoy" refleja las sustituciones ya aplicadas — los
            // demás días muestran el plan base, ya que es el mismo plan
            // que se repite todos los días hasta que el entrenador
            // asigne uno nuevo.
            const dayPlan = index === 0 ? effectivePlan : plan;
            const totals = roundTotals(planTotals(dayPlan));
            return (
              <Card key={date}>
                <CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
                  <CardTitle className="text-sm capitalize">{weekdayLabel(date, index)}</CardTitle>
                  <p className="text-xs tabular-nums text-muted-foreground">{totals.calories} kcal</p>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-1.5">
                  {dayPlan.blocks.map((block) => (
                    <span
                      key={block.id}
                      className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground"
                    >
                      {block.name}
                    </span>
                  ))}
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>
      </Tabs>

      {target && (
        <SubstituteFoodDialog
          open={target !== null}
          onOpenChange={(open) => !open && setTarget(null)}
          foodId={target.currentFoodId}
          foodName={target.name}
          quantityGrams={target.currentQuantity}
          applying={applying}
          onPick={handlePick}
        />
      )}

      <FoodDetailDrawer food={detailFood} onOpenChange={(open) => !open && setDetailFood(null)} />
    </div>
  );
}

function FoodRow({
  food,
  nested,
  onSubstitute,
  onOpenDetail,
}: {
  food: ClientNutritionDirectFood | ClientNutritionIngredient;
  nested?: boolean;
  onSubstitute: () => void;
  onOpenDetail: () => void;
}) {
  const equivalence = formatHouseholdEquivalence(
    food.quantityGrams,
    food.householdUnitName,
    food.householdUnitGrams,
  );
  return (
    <div
      className={
        nested
          ? "flex items-center gap-1"
          : "flex items-center gap-1 rounded-lg border pr-1"
      }
    >
      <button
        type="button"
        onClick={onOpenDetail}
        className={
          nested
            ? "flex min-w-0 flex-1 items-center gap-2.5 rounded-lg py-1 text-left hover:bg-accent"
            : "flex min-w-0 flex-1 items-center gap-2.5 px-3 py-2.5 text-left hover:bg-accent"
        }
      >
        <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/12 text-primary">
          {React.createElement(foodCategoryIcon(food.categorySlug), { className: "size-4" })}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">
            {food.name}
            {food.isSubstituted && (
              <span className="ml-1.5 rounded-full bg-indigo-500/15 px-1.5 py-0.5 text-[10px] font-medium text-indigo-600 dark:text-indigo-400">
                sustituido
              </span>
            )}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {Math.round(food.quantityGrams)} g{equivalence ? ` (${equivalence})` : ""}
          </p>
        </div>
      </button>
      <button
        type="button"
        onClick={onSubstitute}
        aria-label={`Sustituir ${food.name}`}
        className="flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
      >
        <Repeat className="size-4" />
      </button>
    </div>
  );
}

function FoodDetailDrawer({
  food,
  onOpenChange,
}: {
  food: DetailFood | null;
  onOpenChange: (open: boolean) => void;
}) {
  const equivalence = food
    ? formatHouseholdEquivalence(food.quantityGrams, food.householdUnitName, food.householdUnitGrams)
    : null;
  const factor = food ? food.quantityGrams / 100 : 0;

  return (
    <ResponsiveDialog open={food !== null} onOpenChange={onOpenChange} title={food?.name ?? ""}>
      {food && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary/12 text-primary">
              {React.createElement(foodCategoryIcon(food.categorySlug), { className: "size-5" })}
            </div>
            <div className="min-w-0">
              <p className="font-medium">{Math.round(food.quantityGrams)} g</p>
              {equivalence && <p className="text-sm text-muted-foreground">{equivalence}</p>}
            </div>
          </div>

          {food.isSubstituted && (
            <p className="rounded-lg bg-indigo-500/10 px-3 py-2 text-sm text-indigo-600 dark:text-indigo-400">
              Sustituiste el alimento original por este.
            </p>
          )}

          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-lg border px-3 py-2.5">
              <p className="text-xs text-muted-foreground uppercase">Calorías</p>
              <p className="text-lg font-semibold tabular-nums">
                {Math.round(food.caloriesPer100g * factor)}
              </p>
            </div>
            <div className="rounded-lg border px-3 py-2.5">
              <p className="text-xs text-muted-foreground uppercase">Proteína</p>
              <p className="text-lg font-semibold tabular-nums">
                {Math.round(food.proteinPer100g * factor)} g
              </p>
            </div>
            <div className="rounded-lg border px-3 py-2.5">
              <p className="text-xs text-muted-foreground uppercase">Carbohidratos</p>
              <p className="text-lg font-semibold tabular-nums">
                {Math.round(food.carbsPer100g * factor)} g
              </p>
            </div>
            <div className="rounded-lg border px-3 py-2.5">
              <p className="text-xs text-muted-foreground uppercase">Grasa</p>
              <p className="text-lg font-semibold tabular-nums">
                {Math.round(food.fatPer100g * factor)} g
              </p>
            </div>
          </div>
        </div>
      )}
    </ResponsiveDialog>
  );
}
