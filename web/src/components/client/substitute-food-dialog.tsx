"use client";

import * as React from "react";
import { Loader2, Repeat, Check } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { formatHouseholdEquivalence } from "@/lib/client-nutrition-utils";
import type { FoodSubstituteOption } from "@/lib/types/client-nutrition";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { Button } from "@/components/ui/button";

interface SubstituteRpcRow {
  food_id: string;
  name: string;
  quantity_grams: number;
  household_unit_name: string | null;
  household_unit_grams: number | null;
  household_unit_quantity: number | null;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

/** Al abrirse, llama a get_food_substitutes() con el alimento y la
 * cantidad actual (ya con el factor de escala del cliente aplicado) —
 * el catálogo por categorías ya garantiza que cualquier alternativa
 * tiene sentido, así que no hace falta aprobación del entrenador: se
 * muestra la lista y se aplica al toque. */
export function SubstituteFoodDialog({
  open,
  onOpenChange,
  foodId,
  foodName,
  quantityGrams,
  applying,
  onPick,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  foodId: string;
  foodName: string;
  quantityGrams: number;
  applying: boolean;
  onPick: (option: FoodSubstituteOption, permanent: boolean) => void;
}) {
  const [loading, setLoading] = React.useState(true);
  const [options, setOptions] = React.useState<FoodSubstituteOption[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  // Alcance del cambio: solo hoy (lo más común, por eso es el default) o
  // fijo en todo el plan de este cliente. Se reinicia a "solo hoy" cada
  // vez que se abre el diálogo, ajustando el estado durante el render
  // (sin efecto), que es el patrón que recomienda React para resetear
  // estado derivado de una prop.
  const [permanent, setPermanent] = React.useState(false);
  const [wasOpen, setWasOpen] = React.useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setPermanent(false);
  }

  React.useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const { data, error: rpcError } = await supabase.rpc("get_food_substitutes", {
        p_food_id: foodId,
        p_quantity_grams: quantityGrams,
      });
      if (cancelled) return;
      if (rpcError) {
        setError("No se pudieron buscar sustitutos. Intenta de nuevo.");
        setLoading(false);
        return;
      }
      const rows = ((data ?? []) as SubstituteRpcRow[]).map((r) => ({
        foodId: r.food_id,
        name: r.name,
        quantityGrams: r.quantity_grams,
        householdUnitName: r.household_unit_name,
        householdUnitGrams: r.household_unit_grams,
        householdUnitQuantity: r.household_unit_quantity,
        calories: r.calories,
        protein: r.protein,
        carbs: r.carbs,
        fat: r.fat,
      }));
      setOptions(rows);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [open, foodId, quantityGrams]);

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange} title={`Sustituir ${foodName}`}>
      <div className="flex flex-col gap-3">
        <p className="text-sm text-muted-foreground">
          Alternativas de la misma categoría con calorías y proteína equivalentes.
        </p>

        <div className="grid grid-cols-2 gap-2">
          {[
            { value: false, label: "Solo hoy", hint: "Cambia únicamente el día de hoy" },
            { value: true, label: "Todo el plan", hint: "Queda así todos los días" },
          ].map((scope) => (
            <button
              key={String(scope.value)}
              type="button"
              onClick={() => setPermanent(scope.value)}
              className={cn(
                "rounded-lg border px-3 py-2 text-left transition-colors",
                permanent === scope.value
                  ? "border-primary bg-primary/10"
                  : "hover:bg-accent",
              )}
            >
              <span className="block text-sm font-medium">{scope.label}</span>
              <span className="block text-xs text-muted-foreground">{scope.hint}</span>
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <p className="py-4 text-center text-sm text-destructive">{error}</p>
        ) : options.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center text-muted-foreground">
            <Repeat className="size-6" />
            <p className="text-sm">
              No hay sustitutos disponibles para este alimento en este momento — no encontramos otra
              opción de la misma categoría con calorías y proteína parecidas.
            </p>
          </div>
        ) : (
          <div className="flex max-h-96 flex-col gap-2 overflow-y-auto">
            {options.map((option) => {
              const equivalence = formatHouseholdEquivalence(
                option.quantityGrams,
                option.householdUnitName,
                option.householdUnitGrams,
              );
              return (
                <button
                  key={option.foodId}
                  type="button"
                  disabled={applying}
                  onClick={() => onPick(option, permanent)}
                  className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors hover:border-primary/40 hover:bg-accent disabled:opacity-50"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{option.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {Math.round(option.quantityGrams)} g
                      {equivalence ? ` (${equivalence})` : ""}
                    </p>
                    <p className="mt-0.5 text-xs tabular-nums text-muted-foreground">
                      {Math.round(option.calories)} kcal · {Math.round(option.protein)}g prot ·{" "}
                      {Math.round(option.carbs)}g carb · {Math.round(option.fat)}g grasa
                    </p>
                  </div>
                  <Button type="button" size="sm" variant="outline" disabled={applying} tabIndex={-1}>
                    <Check className="size-3.5" /> Usar
                  </Button>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </ResponsiveDialog>
  );
}
