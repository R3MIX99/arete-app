"use client";

import Link from "next/link";
import { ChevronRight, Flame } from "lucide-react";

import type { NutritionTotals } from "@/lib/types/client-nutrition";
import { Card, CardContent } from "@/components/ui/card";

/** Resumen de lo que le toca comer hoy, para no tener que entrar a la
 * pestaña de Nutrición solo para ver el objetivo del día. */
export function ClientNutritionSummary({
  totals,
  calorieTarget,
}: {
  totals: NutritionTotals;
  calorieTarget: number | null;
}) {
  return (
    <Link href="/cliente/nutricion">
      <Card className="transition-colors hover:bg-accent/40">
        <CardContent className="flex flex-col gap-3 p-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Flame className="size-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-muted-foreground">Tu plan de hoy</p>
              <p className="text-lg leading-tight font-semibold tabular-nums">
                {totals.calories} <span className="text-sm font-normal">kcal</span>
                {calorieTarget ? (
                  <span className="text-sm font-normal text-muted-foreground">
                    {" "}
                    de {calorieTarget}
                  </span>
                ) : null}
              </p>
            </div>
            <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
          </div>

          <div className="grid grid-cols-3 divide-x rounded-lg bg-muted/40">
            <Macro label="Proteína" value={totals.protein} />
            <Macro label="Carbos" value={totals.carbs} />
            <Macro label="Grasa" value={totals.fat} />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function Macro({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col items-center gap-0.5 px-2 py-2">
      <span className="text-sm font-semibold tabular-nums">{value} g</span>
      <span className="text-[11px] text-muted-foreground">{label}</span>
    </div>
  );
}
