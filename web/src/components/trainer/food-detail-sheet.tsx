import Link from "next/link";
import { Pencil } from "lucide-react";

import { householdMeasureFor } from "@/lib/format";
import { foodCategoryIcon } from "@/lib/food-icons";
import { createClient } from "@/lib/supabase/client";
import type { FoodOption } from "@/lib/types/nutrition";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function FoodDetailSheet({ food }: { food: FoodOption }) {
  const measure = householdMeasureFor(100, food.household_unit_name, food.household_unit_grams);
  const Icon = foodCategoryIcon(food.category_slug);
  const imageUrl = food.image_path
    ? createClient().storage.from("food-images").getPublicUrl(food.image_path).data.publicUrl
    : null;

  return (
    <div className="flex flex-col gap-3">
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={food.name}
          className="h-40 w-full rounded-lg object-cover"
        />
      ) : (
        <div className="flex h-40 w-full items-center justify-center rounded-lg bg-primary/12 text-primary">
          <Icon className="size-10" />
        </div>
      )}

      <Badge variant="secondary" className="w-fit">
        {food.category_name}
      </Badge>
      <div className="grid grid-cols-4 gap-2 text-center">
        <MacroStat label="Kcal" value={Math.round(food.calories_per_100g)} />
        <MacroStat label="Prot" value={`${Math.round(food.protein_per_100g)}g`} />
        <MacroStat label="Carb" value={`${Math.round(food.carbs_per_100g)}g`} />
        <MacroStat label="Grasa" value={`${Math.round(food.fat_per_100g)}g`} />
      </div>
      <p className="text-xs text-muted-foreground">Valores por cada 100 g.</p>
      {food.household_unit_name && (
        <p className="text-xs text-muted-foreground">
          Medida casera: {food.household_unit_name} ≈ {food.household_unit_grams} g
          {measure ? ` (100 g ≈ ${measure})` : ""}
        </p>
      )}

      <Button variant="outline" size="sm" className="w-fit" asChild>
        <Link href={`/entrenador/nutricion/alimentos/${food.id}`}>
          <Pencil /> Editar alimento
        </Link>
      </Button>
    </div>
  );
}

function MacroStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg bg-foreground/[0.04] px-2 py-2">
      <p className="text-sm font-semibold tabular-nums">{value}</p>
      <p className="text-[10px] text-muted-foreground uppercase">{label}</p>
    </div>
  );
}
