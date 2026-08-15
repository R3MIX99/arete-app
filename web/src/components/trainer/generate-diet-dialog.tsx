"use client";

import * as React from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import type { AiDietResult } from "@/lib/types/ai";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface DishRow {
  id: string;
  name: string;
  meal_type: string;
}

interface DishIngredientRow {
  dish_id: string;
  quantity_grams: number;
  foods:
    | { calories_per_100g: number; protein_per_100g: number; carbs_per_100g: number; fat_per_100g: number }
    | { calories_per_100g: number; protein_per_100g: number; carbs_per_100g: number; fat_per_100g: number }[]
    | null;
}

function one<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

/** Recolecta los datos para pedirle a la IA un plan nutricional completo
 * (meta calórica, preferencias, restricciones), arma el catálogo de
 * platillos/alimentos del entrenador y llama a la Edge Function
 * "generate-diet". El resultado se entrega al padre — este diálogo no
 * guarda nada en la base de datos. */
export function GenerateDietDialog({
  open,
  onOpenChange,
  trainerId,
  defaultCalorieTarget,
  onGenerated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trainerId: string;
  defaultCalorieTarget: number | null;
  onGenerated: (result: AiDietResult) => void;
}) {
  const [calorieTarget, setCalorieTarget] = React.useState<number | "">(defaultCalorieTarget ?? "");
  const [preferences, setPreferences] = React.useState("");
  const [restrictions, setRestrictions] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);


  async function handleGenerate() {
    setLoading(true);
    setError(null);
    const supabase = createClient();

    const ownFilter = `trainer_id.is.null,trainer_id.eq.${trainerId}`;
    const [{ data: dishRows }, { data: foodRows }] = await Promise.all([
      supabase.from("dishes").select("id, name, meal_type").or(ownFilter).order("name"),
      supabase
        .from("foods")
        .select(
          "id, name, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, food_categories(name)",
        )
        .or(ownFilter)
        .order("name"),
    ]);

    const typedDishRows = (dishRows ?? []) as DishRow[];
    const dishIds = typedDishRows.map((d) => d.id);
    const dishTotals = new Map<string, { calories: number; protein: number; carbs: number; fat: number }>();
    if (dishIds.length > 0) {
      const { data: ingredientRows } = await supabase
        .from("dish_ingredients")
        .select(
          "dish_id, quantity_grams, foods(calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g)",
        )
        .in("dish_id", dishIds);
      for (const row of (ingredientRows ?? []) as DishIngredientRow[]) {
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

    const dishes = typedDishRows.map((d) => {
      const totals = dishTotals.get(d.id) ?? { calories: 0, protein: 0, carbs: 0, fat: 0 };
      return {
        id: d.id,
        name: d.name,
        meal_type: d.meal_type,
        calories: Math.round(totals.calories),
        protein: Math.round(totals.protein),
        carbs: Math.round(totals.carbs),
        fat: Math.round(totals.fat),
      };
    });

    interface FoodRow {
      id: string;
      name: string;
      calories_per_100g: number;
      protein_per_100g: number;
      carbs_per_100g: number;
      fat_per_100g: number;
      food_categories: { name: string } | { name: string }[] | null;
    }
    const foods = ((foodRows ?? []) as FoodRow[]).map((f) => ({
      id: f.id,
      name: f.name,
      category: one(f.food_categories)?.name ?? "",
      calories_per_100g: f.calories_per_100g,
      protein_per_100g: f.protein_per_100g,
      carbs_per_100g: f.carbs_per_100g,
      fat_per_100g: f.fat_per_100g,
    }));

    if (dishes.length === 0 && foods.length === 0) {
      setLoading(false);
      setError("Todavía no tienes platillos ni alimentos en tu catálogo para armar un plan.");
      return;
    }

    const { data, error: fnError } = await supabase.functions.invoke("generate-diet", {
      body: {
        calorieTarget: calorieTarget === "" ? null : calorieTarget,
        preferences,
        restrictions,
        dishes,
        foods,
      },
    });

    setLoading(false);
    if (fnError || !data || data.error) {
      const message = data?.error ?? "No se pudo generar el plan. Intenta de nuevo.";
      setError(message);
      toast.error(message);
      return;
    }

    onGenerated(data as AiDietResult);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="size-4 text-primary" /> Generar plan con IA
          </DialogTitle>
          <DialogDescription>
            Se arma con platillos y alimentos de tu catálogo. Vas a poder revisar y editar todo antes de
            usarlo.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ai_calorie_target">Meta calórica diaria (opcional)</Label>
            <Input
              id="ai_calorie_target"
              type="number"
              min={1}
              value={calorieTarget}
              onChange={(e) => setCalorieTarget(e.target.value === "" ? "" : Number(e.target.value))}
              placeholder="Ej. 1800"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ai_preferences">Preferencias del cliente (opcional)</Label>
            <Textarea
              id="ai_preferences"
              value={preferences}
              onChange={(e) => setPreferences(e.target.value)}
              rows={2}
              placeholder="Ej. le gusta la comida mexicana, alto en proteína, poca lácteos..."
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ai_restrictions">Restricciones o alergias (opcional)</Label>
            <Textarea
              id="ai_restrictions"
              value={restrictions}
              onChange={(e) => setRestrictions(e.target.value)}
              rows={2}
              placeholder="Ej. alérgico a los mariscos, sin gluten..."
            />
          </div>

          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}

          <Button type="button" disabled={loading} onClick={handleGenerate}>
            {loading ? <Loader2 className="animate-spin" /> : <Sparkles />}
            {loading ? "Generando..." : "Generar plan"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
