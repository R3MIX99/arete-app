"use client";

import Link from "next/link";
import { Star } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { formatDate, mealTypeLabel } from "@/lib/format";
import { foodCategoryIcon, mealTypeIcon } from "@/lib/food-icons";
import type { DishOption, FoodOption } from "@/lib/types/nutrition";
import { Badge } from "@/components/ui/badge";
import { SortableHeader } from "@/components/trainer/exercise-table-view";

export type SortDirection = "asc" | "desc";
export type FoodSortKey = "name" | "date" | "calories" | "protein" | "carbs" | "fat";
export type DishSortKey = "name" | "date";

export interface FoodSort {
  key: FoodSortKey;
  dir: SortDirection;
}
export interface DishSort {
  key: DishSortKey;
  dir: SortDirection;
}

/** Al pulsar un encabezado: si ya es la columna activa se invierte el
 * sentido; si no, arranca en el que tiene más sentido para esa columna
 * (nombre de A a Z; fechas y cantidades de mayor a menor). */
function nextSort<K extends string>(
  current: { key: K; dir: SortDirection },
  key: K,
): { key: K; dir: SortDirection } {
  if (current.key === key) return { key, dir: current.dir === "asc" ? "desc" : "asc" };
  return { key, dir: key === "name" ? "asc" : "desc" };
}

function Thumb({
  imageUrl,
  Icon,
}: {
  imageUrl: string | null;
  Icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="relative size-10 shrink-0 overflow-hidden rounded-lg bg-primary/12">
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center text-primary">
          <Icon className="size-4" />
        </div>
      )}
    </div>
  );
}

function number(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

export function FoodsTableView({
  foods,
  favoriteIds,
  sort,
  onSortChange,
  onOpen,
  onToggleFavorite,
}: {
  foods: FoodOption[];
  favoriteIds: Set<string>;
  sort: FoodSort;
  onSortChange: (next: FoodSort) => void;
  onOpen: (food: FoodOption) => void;
  onToggleFavorite: (event: React.MouseEvent, food: FoodOption) => void;
}) {
  const header = (key: FoodSortKey, label: string, className?: string) => (
    <SortableHeader
      label={label}
      className={className}
      active={sort.key === key}
      direction={sort.dir}
      onClick={() => onSortChange(nextSort(sort, key))}
    />
  );

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-foreground/[0.02] text-left text-xs text-muted-foreground uppercase">
            <th className="w-10 px-3 py-2" />
            {header("name", "Alimento")}
            <th className="px-3 py-2 font-medium">Categoría</th>
            {header("calories", "Kcal", "whitespace-nowrap")}
            {header("protein", "Prot (g)", "whitespace-nowrap")}
            {header("carbs", "Carb (g)", "whitespace-nowrap")}
            {header("fat", "Grasa (g)", "whitespace-nowrap")}
            <th className="px-3 py-2 font-medium whitespace-nowrap">Medida casera</th>
            {header("date", "Agregado", "whitespace-nowrap")}
          </tr>
        </thead>
        <tbody>
          {foods.map((food) => {
            const Icon = foodCategoryIcon(food.category_slug);
            const imageUrl = food.image_path
              ? createClient().storage.from("food-images").getPublicUrl(food.image_path).data.publicUrl
              : null;
            const isFavorite = favoriteIds.has(food.id);
            return (
              <tr
                key={food.id}
                onClick={() => onOpen(food)}
                className="cursor-pointer border-b last:border-b-0 hover:bg-foreground/[0.02]"
              >
                <td className="px-3 py-2.5">
                  <button
                    type="button"
                    aria-label={isFavorite ? "Quitar de favoritos" : "Agregar a favoritos"}
                    onClick={(e) => onToggleFavorite(e, food)}
                    className="flex size-6 items-center justify-center text-muted-foreground hover:text-foreground"
                  >
                    <Star
                      className="size-4"
                      fill={isFavorite ? "currentColor" : "none"}
                      color={isFavorite ? "#facc15" : "currentColor"}
                    />
                  </button>
                </td>
                <td className="px-3 py-2.5">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <Thumb imageUrl={imageUrl} Icon={Icon} />
                    <span className="min-w-0 truncate font-medium">{food.name}</span>
                  </div>
                </td>
                <td className="px-3 py-2.5">
                  <Badge variant="secondary" className="text-[10px]">
                    {food.category_name}
                  </Badge>
                </td>
                <td className="px-3 py-2.5 tabular-nums">{number(food.calories_per_100g)}</td>
                <td className="px-3 py-2.5 tabular-nums">{number(food.protein_per_100g)}</td>
                <td className="px-3 py-2.5 tabular-nums">{number(food.carbs_per_100g)}</td>
                <td className="px-3 py-2.5 tabular-nums">{number(food.fat_per_100g)}</td>
                <td className="px-3 py-2.5 whitespace-nowrap text-muted-foreground">
                  {food.household_unit_name && food.household_unit_grams
                    ? `1 ${food.household_unit_name} = ${number(food.household_unit_grams)} g`
                    : "—"}
                </td>
                <td className="px-3 py-2.5 whitespace-nowrap text-muted-foreground">
                  {food.created_at ? formatDate(food.created_at) : "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="border-t px-3 py-2 text-xs text-muted-foreground">
        Calorías y macros por cada 100 g.
      </p>
    </div>
  );
}

export function DishesTableView({
  dishes,
  sort,
  onSortChange,
}: {
  dishes: DishOption[];
  sort: DishSort;
  onSortChange: (next: DishSort) => void;
}) {
  const header = (key: DishSortKey, label: string, className?: string) => (
    <SortableHeader
      label={label}
      className={className}
      active={sort.key === key}
      direction={sort.dir}
      onClick={() => onSortChange(nextSort(sort, key))}
    />
  );

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-foreground/[0.02] text-left text-xs text-muted-foreground uppercase">
            {header("name", "Platillo")}
            <th className="px-3 py-2 font-medium">Tipo de comida</th>
            <th className="px-3 py-2 font-medium">Descripción</th>
            {header("date", "Agregado", "whitespace-nowrap")}
          </tr>
        </thead>
        <tbody>
          {dishes.map((dish) => {
            const Icon = mealTypeIcon(dish.meal_type);
            const imageUrl = dish.image_path
              ? createClient().storage.from("food-images").getPublicUrl(dish.image_path).data.publicUrl
              : null;
            return (
              <tr key={dish.id} className="border-b last:border-b-0 hover:bg-foreground/[0.02]">
                <td className="px-3 py-2.5">
                  <Link
                    href={`/entrenador/nutricion/platillos/${dish.id}`}
                    className="flex min-w-0 items-center gap-2.5"
                  >
                    <Thumb imageUrl={imageUrl} Icon={Icon} />
                    <span className="min-w-0 truncate font-medium">{dish.name}</span>
                  </Link>
                </td>
                <td className="px-3 py-2.5">
                  <Badge variant="secondary" className="text-[10px]">
                    {mealTypeLabel(dish.meal_type)}
                  </Badge>
                </td>
                <td className="max-w-xs px-3 py-2.5 text-muted-foreground">
                  <span className="line-clamp-1">{dish.description || "—"}</span>
                </td>
                <td className="px-3 py-2.5 whitespace-nowrap text-muted-foreground">
                  {dish.created_at ? formatDate(dish.created_at) : "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
