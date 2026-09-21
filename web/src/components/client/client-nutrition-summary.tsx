"use client";

import Link from "next/link";
import { ChevronRight, Flame, Utensils } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { blockTotals, roundTotals } from "@/lib/client-nutrition-utils";
import type {
  ClientNutritionBlock,
  ClientNutritionPlan,
  NutritionTotals,
} from "@/lib/types/client-nutrition";
import { HomeSectionTitle } from "@/components/client/home-section-title";

function imagePathOf(block: ClientNutritionBlock): string | null {
  return block.imagePath ?? block.items.find((item) => item.dishImagePath)?.dishImagePath ?? null;
}

function mealTitle(block: ClientNutritionBlock): string {
  const names = block.items
    .map((item) => (item.kind === "dish" ? item.dishName : item.food?.name))
    .filter((name): name is string => Boolean(name));
  return names.length > 0 ? names.join(", ") : block.name;
}

/** Sección "Tus alimentos de hoy" del inicio: calorías y macros del día y
 * cada comida con su foto, para no tener que entrar a Nutrición solo a ver
 * qué toca. */
export function ClientNutritionSummary({
  plan,
  totals,
  calorieTarget,
}: {
  plan: ClientNutritionPlan;
  totals: NutritionTotals;
  calorieTarget: number | null;
}) {
  const blocks = plan.blocks.slice().sort((a, b) => a.orderIndex - b.orderIndex);
  const storage = createClient().storage.from("food-images");

  return (
    <section className="flex flex-col gap-5">
      <HomeSectionTitle>Tus alimentos de hoy</HomeSectionTitle>

      <Link href="/cliente/nutricion" className="flex items-center gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Flame className="size-5" />
        </div>
        <p className="min-w-0 flex-1 text-2xl leading-tight font-medium tabular-nums">
          {totals.calories} <span className="text-base font-normal">kcal</span>
          {calorieTarget ? (
            <span className="text-base font-normal text-muted-foreground"> de {calorieTarget}</span>
          ) : null}
        </p>
        <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
      </Link>

      <div className="grid grid-cols-3 text-center">
        <Macro label="Proteína" value={totals.protein} />
        <Macro label="Carbos" value={totals.carbs} />
        <Macro label="Grasa" value={totals.fat} />
      </div>

      <ul className="flex flex-col gap-4">
        {blocks.map((block) => {
          const t = roundTotals(blockTotals(block));
          const path = imagePathOf(block);
          const url = path ? storage.getPublicUrl(path).data.publicUrl : null;
          return (
            <li key={block.id}>
              <Link href="/cliente/nutricion" className="flex items-center gap-4">
                <div className="relative size-[74px] shrink-0 overflow-hidden rounded-2xl bg-primary/10">
                  {url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={url} alt="" className="absolute inset-0 size-full object-cover" />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-primary">
                      <Utensils className="size-6" />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-muted-foreground">{block.name}</p>
                  <p className="truncate text-lg leading-snug font-medium">{mealTitle(block)}</p>
                  <span className="mt-1 inline-block rounded-md bg-primary/10 px-2 py-0.5 text-xs text-primary tabular-nums">
                    {t.calories} kcal - {t.protein}g prot
                  </span>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function Macro({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className="text-lg font-medium tabular-nums">{value} g</span>
      <span className="text-sm text-muted-foreground">{label}</span>
    </div>
  );
}
