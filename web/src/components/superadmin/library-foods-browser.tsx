"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, Plus, Apple, FileSpreadsheet, FilterX, LayoutGrid, List } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { foodCategoryIcon } from "@/lib/food-icons";
import type { FoodOption } from "@/lib/types/nutrition";
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
import { ImportFoodsDialog } from "@/components/trainer/import-foods-dialog";
import {
  FOOD_SORT_OPTIONS,
  FoodsTableView,
  parseSort,
  sortFoods,
  sortValue,
  type FoodSort,
  type FoodSortKey,
} from "@/components/trainer/nutrition-table-views";

type ViewMode = "grid" | "table";

export function LibraryFoodsBrowser({ foods }: { foods: FoodOption[] }) {
  const router = useRouter();
  const [query, setQuery] = React.useState("");
  const [categoryId, setCategoryId] = React.useState<string | null>(null);
  const [sort, setSort] = React.useState<FoodSort>({ key: "name", dir: "asc" });
  const [view, setView] = React.useState<ViewMode>("grid");
  const [importOpen, setImportOpen] = React.useState(false);

  // Las categorías salen de los propios alimentos del catálogo.
  const categories = React.useMemo(() => {
    const map = new Map<string, string>();
    for (const f of foods) map.set(f.food_category_id, f.category_name);
    return [...map.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [foods]);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    const result = foods.filter((f) => {
      if (categoryId && f.food_category_id !== categoryId) return false;
      if (q && !f.name.toLowerCase().includes(q)) return false;
      return true;
    });
    return sortFoods(result, sort);
  }, [foods, query, categoryId, sort]);

  return (
    <div className="flex w-full flex-col gap-6 pt-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-0 flex-1 sm:max-w-xs">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar alimento por nombre"
            className="pl-9"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={categoryId ?? "all"}
            onValueChange={(v) => setCategoryId(v === "all" ? null : v)}
          >
            <SelectTrigger className="w-auto min-w-0 whitespace-nowrap">
              <SelectValue placeholder="Categoría" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las categorías</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={sortValue(sort)}
            onValueChange={(v) => setSort(parseSort<FoodSortKey>(v))}
          >
            <SelectTrigger className="w-auto min-w-0 whitespace-nowrap">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FOOD_SORT_OPTIONS.map((option) => (
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
            disabled={categoryId === null}
            onClick={() => setCategoryId(null)}
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
          <Button variant="outline" onClick={() => setImportOpen(true)}>
            <FileSpreadsheet />
            <span className="hidden md:inline">Importar desde Excel</span>
            <span className="md:hidden">Importar</span>
          </Button>
          <Button asChild>
            <Link href="/superadmin/biblioteca/alimentos/nuevo">
              <Plus /> Nuevo alimento
            </Link>
          </Button>
        </div>
      </div>

      <ImportFoodsDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        trainerId={null}
        existingFoods={foods.map((f) => ({ id: f.id, name: f.name, trainer_id: f.trainer_id }))}
      />

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-16 text-center text-muted-foreground">
          <Apple className="size-8" />
          <p className="text-sm">
            {foods.length === 0
              ? "Todavía no hay alimentos en el catálogo de Aretia."
              : "Ningún alimento coincide con la búsqueda o los filtros."}
          </p>
        </div>
      ) : view === "table" ? (
        <FoodsTableView
          foods={filtered}
          sort={sort}
          onSortChange={setSort}
          onOpen={(food) => router.push(`/superadmin/biblioteca/alimentos/${food.id}`)}
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((food) => {
            const CategoryIcon = foodCategoryIcon(food.category_slug);
            const imageUrl = food.image_path
              ? createClient().storage.from("food-images").getPublicUrl(food.image_path).data
                  .publicUrl
              : null;
            return (
              <Link key={food.id} href={`/superadmin/biblioteca/alimentos/${food.id}`}>
                <Card className="h-full overflow-hidden card-hover-glow transition-colors hover:border-primary/40 gap-0 py-0">
                  <div className="h-28 w-full overflow-hidden bg-primary/12">
                    {imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={imageUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-primary">
                        <CategoryIcon className="size-8" />
                      </div>
                    )}
                  </div>
                  <CardContent className="flex flex-col gap-1 py-4">
                    <p className="truncate text-sm font-semibold">{food.name}</p>
                    <div className="flex flex-wrap gap-1.5">
                      <Badge variant="secondary">{food.category_name}</Badge>
                      <Badge variant="secondary">{Math.round(food.calories_per_100g)} kcal/100g</Badge>
                    </div>
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
