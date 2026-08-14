"use client";

import * as React from "react";
import Link from "next/link";
import { Search, Plus, Utensils, Apple as AppleIcon, FilterX, Pencil, Star } from "lucide-react";
import { toast } from "sonner";

import { mealTypeLabel } from "@/lib/format";
import { foodCategoryIcon, mealTypeIcon } from "@/lib/food-icons";
import { createClient } from "@/lib/supabase/client";
import type { DishOption, FoodCategory, FoodOption } from "@/lib/types/nutrition";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MobileFab } from "@/components/trainer/mobile-fab";
import { FoodDetailSheet } from "@/components/trainer/food-detail-sheet";

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
  const [tab, setTab] = React.useState<"foods" | "dishes">("foods");
  const [query, setQuery] = React.useState("");
  const [categoryId, setCategoryId] = React.useState<string | null>(null);
  const [favoritesOnly, setFavoritesOnly] = React.useState(false);
  const [selectedFood, setSelectedFood] = React.useState<FoodOption | null>(null);
  const [favoriteIds, setFavoriteIds] = React.useState(
    () => new Set(foods.filter((f) => f.is_favorite).map((f) => f.id)),
  );

  const filteredFoods = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return foods.filter((f) => {
      if (favoritesOnly && !favoriteIds.has(f.id)) return false;
      if (categoryId && f.food_category_id !== categoryId) return false;
      if (q && !f.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [foods, query, categoryId, favoritesOnly, favoriteIds]);

  const filteredDishes = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return dishes;
    return dishes.filter((d) => d.name.toLowerCase().includes(q));
  }, [dishes, query]);

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
    }
  }

  const newHref =
    tab === "foods" ? "/entrenador/nutricion/alimentos/nuevo" : "/entrenador/nutricion/platillos/nuevo";
  const newLabel = tab === "foods" ? "Nuevo alimento" : "Nuevo platillo";

  return (
    <div className="flex flex-col gap-6 pt-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex rounded-lg bg-foreground/[0.04] p-1">
          <button
            type="button"
            onClick={() => {
              setTab("foods");
              setQuery("");
            }}
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
            onClick={() => {
              setTab("dishes");
              setQuery("");
            }}
            className={
              tab === "dishes"
                ? "rounded-md bg-card px-3 py-1.5 text-sm font-medium shadow-sm"
                : "rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
            }
          >
            Platillos
          </button>
        </div>
        <div className="relative w-full max-w-xs">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={tab === "foods" ? "Buscar alimento" : "Buscar platillo"}
            className="pl-9"
          />
        </div>
        <Button asChild className="ml-auto hidden md:inline-flex">
          <Link href={newHref}>
            <Plus />
            {newLabel}
          </Link>
        </Button>
      </div>

      <MobileFab href={newHref} icon={Plus} label={newLabel} />

      {tab === "foods" && (
        <div className="flex flex-wrap items-center gap-2">
          <Badge
            variant={favoritesOnly ? "default" : "outline"}
            className="h-7 cursor-pointer gap-1 px-3"
            onClick={() => setFavoritesOnly((v) => !v)}
          >
            <Star className="size-3" fill={favoritesOnly ? "currentColor" : "none"} />
            Favoritos
          </Badge>
          <div className="mx-1 h-4 w-px bg-border" />
          {categories.map((category) => (
            <Badge
              key={category.id}
              variant={categoryId === category.id ? "default" : "outline"}
              className="h-7 cursor-pointer px-3"
              onClick={() =>
                setCategoryId((c) => (c === category.id ? null : category.id))
              }
            >
              {category.name}
            </Badge>
          ))}
          {(categoryId || favoritesOnly) && (
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground"
              onClick={() => {
                setCategoryId(null);
                setFavoritesOnly(false);
              }}
            >
              <FilterX /> Limpiar
            </Button>
          )}
        </div>
      )}

      {tab === "foods" ? (
        filteredFoods.length === 0 ? (
          <EmptyState icon={AppleIcon} empty={foods.length === 0} what="alimentos" />
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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
                    <div className="relative h-20 w-full bg-primary/12">
                      {imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={imageUrl}
                          alt={food.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-primary">
                          <Icon className="size-7" />
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
                      <div className="flex items-center justify-between gap-1">
                        <p className="text-[10px] font-medium tracking-wide text-primary uppercase">
                          {food.category_name}
                        </p>
                        <Link
                          href={`/entrenador/nutricion/alimentos/${food.id}`}
                          aria-label="Editar alimento"
                          onClick={(e) => e.stopPropagation()}
                          className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                        >
                          <Pencil className="size-3.5" />
                        </Link>
                      </div>
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
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredDishes.map((dish) => {
            const Icon = mealTypeIcon(dish.meal_type);
            const imageUrl = dish.image_path
              ? createClient().storage.from("food-images").getPublicUrl(dish.image_path).data
                  .publicUrl
              : null;
            return (
              <Link key={dish.id} href={`/entrenador/nutricion/platillos/${dish.id}`}>
                <Card className="card-hover-glow gap-0 overflow-hidden py-0 transition-colors hover:border-primary/40">
                  <div className="relative h-20 w-full bg-primary/12">
                    {imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={imageUrl} alt={dish.name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-primary">
                        <Icon className="size-7" />
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

      <Dialog open={selectedFood !== null} onOpenChange={(open) => !open && setSelectedFood(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{selectedFood?.name}</DialogTitle>
          </DialogHeader>
          {selectedFood && <FoodDetailSheet food={selectedFood} />}
        </DialogContent>
      </Dialog>
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
