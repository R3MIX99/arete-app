"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Search,
  Plus,
  Utensils,
  Apple as AppleIcon,
  FilterX,
  Star,
  SlidersHorizontal,
  FileSpreadsheet,
  LayoutGrid,
  List,
} from "lucide-react";
import { toast } from "sonner";

import { mealTypeLabel } from "@/lib/format";
import { foodCategoryIcon, mealTypeIcon } from "@/lib/food-icons";
import { createClient } from "@/lib/supabase/client";
import type { DishOption, FoodCategory, FoodOption, MealType } from "@/lib/types/nutrition";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { MobileFab } from "@/components/trainer/mobile-fab";
import { FoodDetailSheet } from "@/components/trainer/food-detail-sheet";
import { ImportFoodsDialog } from "@/components/trainer/import-foods-dialog";
import {
  DISH_SORT_OPTIONS,
  DishesTableView,
  FOOD_SORT_OPTIONS,
  FoodsTableView,
  parseSort,
  sortDishes,
  sortFoods,
  sortValue,
  type DishSort,
  type FoodSort,
  type FoodSortKey,
} from "@/components/trainer/nutrition-table-views";

type Scope = "all" | "favorites" | "custom";
type ViewMode = "grid" | "table";

const MEAL_TYPES: MealType[] = ["breakfast", "lunch", "dinner", "snack"];

export function CatalogBrowser({
  trainerId,
  foods,
  dishes,
  categories,
}: {
  trainerId: string;
  foods: FoodOption[];
  dishes: DishOption[];
  categories: FoodCategory[];
}) {
  const router = useRouter();
  const [tab, setTab] = React.useState<"foods" | "dishes">("foods");
  const [query, setQuery] = React.useState("");
  const [view, setView] = React.useState<ViewMode>("grid");
  const [scope, setScope] = React.useState<Scope>("all");
  const [categoryId, setCategoryId] = React.useState<string | null>(null);
  const [mealType, setMealType] = React.useState<MealType | null>(null);
  const [foodSort, setFoodSort] = React.useState<FoodSort>({ key: "name", dir: "asc" });
  const [dishSort, setDishSort] = React.useState<DishSort>({ key: "name", dir: "asc" });
  const [selectedFood, setSelectedFood] = React.useState<FoodOption | null>(null);
  const [filtersOpen, setFiltersOpen] = React.useState(false);
  const [importOpen, setImportOpen] = React.useState(false);
  const [favoriteIds, setFavoriteIds] = React.useState(
    () => new Set(foods.filter((f) => f.is_favorite).map((f) => f.id)),
  );

  const filteredFoods = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    const result = foods.filter((f) => {
      if (scope === "favorites" && !favoriteIds.has(f.id)) return false;
      if (scope === "custom" && f.trainer_id !== trainerId) return false;
      if (categoryId && f.food_category_id !== categoryId) return false;
      if (q && !f.name.toLowerCase().includes(q)) return false;
      return true;
    });
    return sortFoods(result, foodSort);
  }, [foods, query, categoryId, scope, favoriteIds, trainerId, foodSort]);

  const filteredDishes = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    const result = dishes.filter((d) => {
      if (scope === "custom" && d.trainer_id !== trainerId) return false;
      if (mealType && d.meal_type !== mealType) return false;
      if (q && !d.name.toLowerCase().includes(q)) return false;
      return true;
    });
    return sortDishes(result, dishSort);
  }, [dishes, query, scope, mealType, trainerId, dishSort]);

  async function toggleFavorite(event: React.MouseEvent, food: FoodOption) {
    event.preventDefault();
    event.stopPropagation();
    const supabase = createClient();
    const isFavorite = favoriteIds.has(food.id);
    // Optimista: se refleja de inmediato y se revierte si falla.
    setFavoriteIds((prev) => {
      const next = new Set(prev);
      if (isFavorite) next.delete(food.id);
      else next.add(food.id);
      return next;
    });
    const { error } = isFavorite
      ? await supabase
          .from("food_favorites")
          .delete()
          .eq("trainer_id", trainerId)
          .eq("food_id", food.id)
      : await supabase.from("food_favorites").insert({ trainer_id: trainerId, food_id: food.id });
    if (error) {
      setFavoriteIds((prev) => {
        const next = new Set(prev);
        if (isFavorite) next.add(food.id);
        else next.delete(food.id);
        return next;
      });
      toast.error("No se pudo actualizar favoritos");
      return;
    }
    // Sincroniza el prop del servidor — si esta pestaña se desmonta al
    // cambiar de tab, el favoriteIds local se recalcularía desde `foods`
    // y se perdería el cambio si no refrescamos aquí.
    router.refresh();
  }

  const newHref =
    tab === "foods" ? "/entrenador/nutricion/alimentos/nuevo" : "/entrenador/nutricion/platillos/nuevo";
  const newLabel = tab === "foods" ? "Nuevo alimento" : "Nuevo platillo";

  const hasActiveFilters =
    scope !== "all" || (tab === "foods" ? categoryId !== null : mealType !== null);

  function clearFilters() {
    setScope("all");
    setCategoryId(null);
    setMealType(null);
  }

  function switchTab(next: "foods" | "dishes") {
    setTab(next);
    setQuery("");
    setScope("all");
  }

  // Los mismos selectores se dibujan en la barra (escritorio) y en el
  // cajón de filtros (teléfono); solo cambia el ancho del disparador.
  function filterControls(triggerClass: string) {
    return (
      <>
        <Select value={scope} onValueChange={(v) => setScope(v as Scope)}>
          <SelectTrigger className={triggerClass}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {tab === "foods" ? <SelectItem value="favorites">Favoritos</SelectItem> : null}
            <SelectItem value="custom">Personalizados</SelectItem>
          </SelectContent>
        </Select>

        {tab === "foods" ? (
          <Select
            value={categoryId ?? "all"}
            onValueChange={(v) => setCategoryId(v === "all" ? null : v)}
          >
            <SelectTrigger className={triggerClass}>
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
        ) : (
          <Select
            value={mealType ?? "all"}
            onValueChange={(v) => setMealType(v === "all" ? null : (v as MealType))}
          >
            <SelectTrigger className={triggerClass}>
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
        )}

        <Select
          value={sortValue(tab === "foods" ? foodSort : dishSort)}
          onValueChange={(v) =>
            tab === "foods" ? setFoodSort(parseSort<FoodSortKey>(v)) : setDishSort(parseSort<"name" | "date">(v))
          }
        >
          <SelectTrigger className={triggerClass}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(tab === "foods" ? FOOD_SORT_OPTIONS : DISH_SORT_OPTIONS).map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </>
    );
  }

  return (
    <div className="flex flex-col gap-6 pt-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex rounded-lg bg-foreground/[0.04] p-1">
          <button
            type="button"
            onClick={() => switchTab("foods")}
            className={
              tab === "foods"
                ? "rounded-md bg-card px-3 py-1.5 text-sm font-medium shadow-sm"
                : "rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
            }
          >
            Alimentos
          </button>
          <button
            type="button"
            onClick={() => switchTab("dishes")}
            className={
              tab === "dishes"
                ? "rounded-md bg-card px-3 py-1.5 text-sm font-medium shadow-sm"
                : "rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
            }
          >
            Platillos
          </button>
        </div>

        <div className="flex min-w-0 flex-1 items-center gap-2 sm:max-w-xs">
          <div className="relative min-w-0 flex-1">
            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={tab === "foods" ? "Buscar alimento" : "Buscar platillo"}
              className="pl-9"
            />
          </div>
          {/* Teléfono: los filtros y el orden viven en un cajón. */}
          <Button
            variant="outline"
            size="icon"
            aria-label="Filtros"
            className="relative shrink-0 md:hidden"
            onClick={() => setFiltersOpen(true)}
          >
            <SlidersHorizontal className="size-4" />
            {hasActiveFilters && (
              <span className="absolute -top-1 -right-1 size-2.5 rounded-full bg-primary" />
            )}
          </Button>
          <Button
            variant="outline"
            size="icon"
            aria-label={view === "grid" ? "Ver como tabla" : "Ver como tarjetas"}
            className="shrink-0 md:hidden"
            onClick={() => setView(view === "grid" ? "table" : "grid")}
          >
            {view === "grid" ? <List className="size-4" /> : <LayoutGrid className="size-4" />}
          </Button>
          {tab === "foods" && (
            <Button
              variant="outline"
              size="icon"
              aria-label="Importar desde Excel"
              className="shrink-0 md:hidden"
              onClick={() => setImportOpen(true)}
            >
              <FileSpreadsheet className="size-4" />
            </Button>
          )}
        </div>

        {/* Computadora: selectores de filtro y orden en la misma barra. */}
        <div className="hidden items-center gap-2 md:flex">
          {filterControls("w-auto min-w-0 whitespace-nowrap")}
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground"
            disabled={!hasActiveFilters}
            onClick={clearFilters}
          >
            <FilterX /> Limpiar filtros
          </Button>
        </div>

        <div className="ml-auto hidden items-center gap-2 md:flex">
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
          {tab === "foods" && (
            <Button variant="outline" onClick={() => setImportOpen(true)}>
              <FileSpreadsheet />
              Importar desde Excel
            </Button>
          )}
          <Button asChild>
            <Link href={newHref}>
              <Plus />
              {newLabel}
            </Link>
          </Button>
        </div>
      </div>

      <ImportFoodsDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        trainerId={trainerId}
        existingFoods={foods.map((f) => ({ id: f.id, name: f.name, trainer_id: f.trainer_id }))}
      />

      <MobileFab href={newHref} icon={Plus} label={newLabel} />

      <ResponsiveDialog open={filtersOpen} onOpenChange={setFiltersOpen} title="Filtros">
        {filterControls("w-full")}
        <Button
          variant="ghost"
          size="sm"
          className="w-fit text-muted-foreground"
          disabled={!hasActiveFilters}
          onClick={clearFilters}
        >
          <FilterX /> Limpiar filtros
        </Button>
      </ResponsiveDialog>

      {tab === "foods" ? (
        filteredFoods.length === 0 ? (
          <EmptyState icon={AppleIcon} empty={foods.length === 0} what="alimentos" />
        ) : view === "table" ? (
          <FoodsTableView
            foods={filteredFoods}
            favoriteIds={favoriteIds}
            sort={foodSort}
            onSortChange={setFoodSort}
            onOpen={setSelectedFood}
            onToggleFavorite={toggleFavorite}
          />
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
            {filteredFoods.map((food) => {
              const Icon = foodCategoryIcon(food.category_slug);
              const imageUrl = food.image_path
                ? createClient().storage.from("food-images").getPublicUrl(food.image_path).data
                    .publicUrl
                : null;
              const isFavorite = favoriteIds.has(food.id);
              return (
                <div
                  key={food.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedFood(food)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") setSelectedFood(food);
                  }}
                  className="cursor-pointer text-left"
                >
                  <Card className="card-hover-glow gap-0 overflow-hidden py-0 transition-colors hover:border-primary/40">
                    <div className="relative aspect-[4/3] w-full bg-primary/12">
                      {imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={imageUrl}
                          alt={food.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-primary">
                          <Icon className="size-6" />
                        </div>
                      )}
                      <button
                        type="button"
                        aria-label={isFavorite ? "Quitar de favoritos" : "Agregar a favoritos"}
                        onClick={(e) => toggleFavorite(e, food)}
                        className="absolute top-1.5 left-1.5 flex size-6 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-sm transition-colors hover:bg-black/60"
                      >
                        <Star
                          className="size-3.5"
                          fill={isFavorite ? "currentColor" : "none"}
                          color={isFavorite ? "#facc15" : "currentColor"}
                        />
                      </button>
                    </div>
                    <CardContent className="flex flex-col gap-0.5 px-3 py-2.5">
                      <p className="text-[10px] font-medium tracking-wide text-primary uppercase">
                        {food.category_name}
                      </p>
                      <p className="truncate text-sm font-semibold">{food.name}</p>
                    </CardContent>
                  </Card>
                </div>
              );
            })}
          </div>
        )
      ) : filteredDishes.length === 0 ? (
        <EmptyState icon={Utensils} empty={dishes.length === 0} what="platillos" />
      ) : view === "table" ? (
        <DishesTableView dishes={filteredDishes} sort={dishSort} onSortChange={setDishSort} />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
          {filteredDishes.map((dish) => {
            const Icon = mealTypeIcon(dish.meal_type);
            const imageUrl = dish.image_path
              ? createClient().storage.from("food-images").getPublicUrl(dish.image_path).data
                  .publicUrl
              : null;
            return (
              <Link key={dish.id} href={`/entrenador/nutricion/platillos/${dish.id}`}>
                <Card className="card-hover-glow gap-0 overflow-hidden py-0 transition-colors hover:border-primary/40">
                  <div className="relative aspect-[4/3] w-full bg-primary/12">
                    {imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={imageUrl} alt={dish.name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-primary">
                        <Icon className="size-6" />
                      </div>
                    )}
                  </div>
                  <CardContent className="flex flex-col gap-0.5 px-3 py-2.5">
                    <p className="text-[10px] font-medium tracking-wide text-primary uppercase">
                      {mealTypeLabel(dish.meal_type)}
                    </p>
                    <p className="truncate text-sm font-semibold">{dish.name}</p>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}

      <ResponsiveDialog
        open={selectedFood !== null}
        onOpenChange={(open) => !open && setSelectedFood(null)}
        title={selectedFood?.name ?? ""}
      >
        {selectedFood && <FoodDetailSheet food={selectedFood} />}
      </ResponsiveDialog>
    </div>
  );
}

function EmptyState({
  icon: Icon,
  empty,
  what,
}: {
  icon: React.ComponentType<{ className?: string }>;
  empty: boolean;
  what: string;
}) {
  return (
    <div className="flex flex-col items-center gap-2 py-16 text-center text-muted-foreground">
      <Icon className="size-8" />
      <p className="text-sm">
        {empty
          ? `Todavía no tienes ${what} en tu catálogo.`
          : `Ningún resultado coincide con la búsqueda o los filtros.`}
      </p>
    </div>
  );
}
