"use client";

import * as React from "react";
import Link from "next/link";
import { Search, Plus, Utensils, FilterX, LayoutGrid, List } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { mealTypeLabel } from "@/lib/format";
import { mealTypeIcon } from "@/lib/food-icons";
import type { DishOption, MealType } from "@/lib/types/nutrition";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DISH_SORT_OPTIONS,
  DishesTableView,
  parseSort,
  sortDishes,
  sortValue,
  type DishSort,
  type DishSortKey,
} from "@/components/trainer/nutrition-table-views";

type ViewMode = "grid" | "table";

const MEAL_TYPES: MealType[] = ["breakfast", "lunch", "dinner", "snack"];

export function LibraryDishesBrowser({ dishes }: { dishes: DishOption[] }) {
  const [query, setQuery] = React.useState("");
  const [mealType, setMealType] = React.useState<MealType | null>(null);
  const [sort, setSort] = React.useState<DishSort>({ key: "name", dir: "asc" });
  const [view, setView] = React.useState<ViewMode>("grid");

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    const result = dishes.filter((d) => {
      if (mealType && d.meal_type !== mealType) return false;
      if (q && !d.name.toLowerCase().includes(q)) return false;
      return true;
    });
    return sortDishes(result, sort);
  }, [dishes, query, mealType, sort]);

  return (
    <div className="flex w-full flex-col gap-6 pt-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-0 flex-1 sm:max-w-xs">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar platillo por nombre"
            className="pl-9"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={mealType ?? "all"}
            onValueChange={(v) => setMealType(v === "all" ? null : (v as MealType))}
          >
            <SelectTrigger className="w-auto min-w-0 whitespace-nowrap">
              <SelectValue placeholder="Tipo de comida" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los tipos</SelectItem>
              {MEAL_TYPES.map((type) => (
                <SelectItem key={type} value={type}>
                  {mealTypeLabel(type)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={sortValue(sort)}
            onValueChange={(v) => setSort(parseSort<DishSortKey>(v))}
          >
            <SelectTrigger className="w-auto min-w-0 whitespace-nowrap">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DISH_SORT_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground"
            disabled={mealType === null}
            onClick={() => setMealType(null)}
          >
            <FilterX /> Limpiar filtros
          </Button>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <div className="flex items-center rounded-lg border p-0.5">
            <Button
              variant={view === "grid" ? "secondary" : "ghost"}
              size="icon"
              className="size-8"
              aria-label="Vista de tarjetas"
              onClick={() => setView("grid")}
            >
              <LayoutGrid className="size-4" />
            </Button>
            <Button
              variant={view === "table" ? "secondary" : "ghost"}
              size="icon"
              className="size-8"
              aria-label="Vista de tabla"
              onClick={() => setView("table")}
            >
              <List className="size-4" />
            </Button>
          </div>
          <Button asChild>
            <Link href="/superadmin/biblioteca/platillos/nuevo">
              <Plus /> Nuevo platillo
            </Link>
          </Button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-16 text-center text-muted-foreground">
          <Utensils className="size-8" />
          <p className="text-sm">
            {dishes.length === 0
              ? "Todavía no hay platillos en el catálogo de Aretia."
              : "Ningún platillo coincide con la búsqueda o los filtros."}
          </p>
        </div>
      ) : view === "table" ? (
        <DishesTableView
          dishes={filtered}
          sort={sort}
          onSortChange={setSort}
          hrefBase="/superadmin/biblioteca/platillos"
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((dish) => {
            const MealIcon = mealTypeIcon(dish.meal_type);
            const imageUrl = dish.image_path
              ? createClient().storage.from("food-images").getPublicUrl(dish.image_path).data
                  .publicUrl
              : null;
            return (
              <Link key={dish.id} href={`/superadmin/biblioteca/platillos/${dish.id}`}>
                <Card className="h-full overflow-hidden card-hover-glow transition-colors hover:border-primary/40 gap-0 py-0">
                  <div className="h-28 w-full overflow-hidden bg-primary/12">
                    {imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={imageUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-primary">
                        <MealIcon className="size-8" />
                      </div>
                    )}
                  </div>
                  <CardContent className="flex flex-col gap-1 py-4">
                    <p className="truncate text-sm font-semibold">{dish.name}</p>
                    <Badge variant="secondary" className="w-fit">
                      {mealTypeLabel(dish.meal_type)}
                    </Badge>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
