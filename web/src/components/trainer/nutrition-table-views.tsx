"use client";

import Link from "next/link";
import { Star } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { formatTimestampDate, mealTypeLabel } from "@/lib/format";
import { foodCategoryIcon, mealTypeIcon } from "@/lib/food-icons";
import type { DishOption, FoodOption } from "@/lib/types/nutrition";
import { Badge } from "@/components/ui/badge";
import { TablePagination, usePagination } from "@/components/ui/table-pagination";
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

export const FOOD_SORT_OPTIONS: { value: string; label: string }[] = [
  { value: "name_asc", label: "Nombre (A-Z)" },
  { value: "name_desc", label: "Nombre (Z-A)" },
  { value: "date_desc", label: "Más reciente" },
  { value: "date_asc", label: "Menos reciente" },
  { value: "calories_desc", label: "Más calorías" },
  { value: "calories_asc", label: "Menos calorías" },
  { value: "protein_desc", label: "Más proteína" },
  { value: "protein_asc", label: "Menos proteína" },
  { value: "carbs_desc", label: "Más carbohidratos" },
  { value: "carbs_asc", label: "Menos carbohidratos" },
  { value: "fat_desc", label: "Más grasa" },
  { value: "fat_asc", label: "Menos grasa" },
];

export const DISH_SORT_OPTIONS = FOOD_SORT_OPTIONS.slice(0, 4);

/** "calories_desc" -> { key: "calories", dir: "desc" } */
export function parseSort<K extends string>(value: string): { key: K; dir: SortDirection } {
  const [key, dir] = value.split("_");
  return { key: key as K, dir: dir === "desc" ? "desc" : "asc" };
}

export function sortValue(sort: { key: string; dir: SortDirection }): string {
  return `${sort.key}_${sort.dir}`;
}

const FOOD_NUMERIC_FIELDS = {
  calories: "calories_per_100g",
  protein: "protein_per_100g",
  carbs: "carbs_per_100g",
  fat: "fat_per_100g",
} as const;

export function sortFoods(foods: FoodOption[], sort: FoodSort): FoodOption[] {
  const factor = sort.dir === "asc" ? 1 : -1;
  return [...foods].sort((a, b) => {
    switch (sort.key) {
      case "name":
        return factor * a.name.localeCompare(b.name);
      case "date":
        return factor * (a.created_at ?? "").localeCompare(b.created_at ?? "");
      default: {
        const field = FOOD_NUMERIC_FIELDS[sort.key];
        return factor * (a[field] - b[field]) || a.name.localeCompare(b.name);
      }
    }
  });
}

export function sortDishes(dishes: DishOption[], sort: DishSort): DishOption[] {
  const factor = sort.dir === "asc" ? 1 : -1;
  return [...dishes].sort((a, b) =>
    sort.key === "date"
      ? factor * (a.created_at ?? "").localeCompare(b.created_at ?? "")
      : factor * a.name.localeCompare(b.name),
  );
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
  /** Sin favoritos (p. ej. el catálogo global del superadmin) se omite la
   * columna de la estrella. */
  favoriteIds?: Set<string>;
  sort: FoodSort;
  onSortChange: (next: FoodSort) => void;
  onOpen: (food: FoodOption) => void;
  onToggleFavorite?: (event: React.MouseEvent, food: FoodOption) => void;
}) {
  const showFavorites = Boolean(favoriteIds && onToggleFavorite);
  const pagination = usePagination(foods);
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
    <div className="rounded-lg border">
      <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-foreground/[0.02] text-left text-xs text-muted-foreground uppercase">
            {showFavorites ? <th className="w-10 px-3 py-2" /> : null}
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
          {pagination.pageItems.map((food) => {
            const Icon = foodCategoryIcon(food.category_slug);
            const imageUrl = food.image_path
              ? createClient().storage.from("food-images").getPublicUrl(food.image_path).data.publicUrl
              : null;
            const isFavorite = favoriteIds?.has(food.id) ?? false;
            return (
              <tr
                key={food.id}
                onClick={() => onOpen(food)}
                className="cursor-pointer border-b last:border-b-0 hover:bg-foreground/[0.02]"
              >
                {showFavorites ? (
                <td className="px-3 py-2.5">
                  <button
                    type="button"
                    aria-label={isFavorite ? "Quitar de favoritos" : "Agregar a favoritos"}
                    onClick={(e) => onToggleFavorite?.(e, food)}
                    className="flex size-6 items-center justify-center text-muted-foreground hover:text-foreground"
                  >
                    <Star
                      className="size-4"
                      fill={isFavorite ? "currentColor" : "none"}
                      color={isFavorite ? "#facc15" : "currentColor"}
                    />
                  </button>
                </td>
                ) : null}
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
                  {food.created_at ? formatTimestampDate(food.created_at) : "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      </div>
      <TablePagination pagination={pagination} noun="alimentos" />
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
  hrefBase = "/entrenador/nutricion/platillos",
}: {
  dishes: DishOption[];
  sort: DishSort;
  onSortChange: (next: DishSort) => void;
  hrefBase?: string;
}) {
  const pagination = usePagination(dishes);
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
    <div className="rounded-lg border">
      <div className="overflow-x-auto">
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
          {pagination.pageItems.map((dish) => {
            const Icon = mealTypeIcon(dish.meal_type);
            const imageUrl = dish.image_path
              ? createClient().storage.from("food-images").getPublicUrl(dish.image_path).data.publicUrl
              : null;
            return (
              <tr key={dish.id} className="border-b last:border-b-0 hover:bg-foreground/[0.02]">
                <td className="px-3 py-2.5">
                  <Link
                    href={`${hrefBase}/${dish.id}`}
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
                  {dish.created_at ? formatTimestampDate(dish.created_at) : "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      </div>
      <TablePagination pagination={pagination} noun="platillos" />
    </div>
  );
}
