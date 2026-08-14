"use client";

import * as React from "react";
import Link from "next/link";
import { Search, Plus, Utensils, Apple as AppleIcon, FilterX } from "lucide-react";

import { mealTypeLabel } from "@/lib/format";
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
  foods,
  dishes,
  categories,
}: {
  foods: FoodOption[];
  dishes: DishOption[];
  categories: FoodCategory[];
}) {
  const [tab, setTab] = React.useState<"foods" | "dishes">("foods");
  const [query, setQuery] = React.useState("");
  const [categoryId, setCategoryId] = React.useState<string | null>(null);
  const [selectedFood, setSelectedFood] = React.useState<FoodOption | null>(null);

  const filteredFoods = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return foods.filter((f) => {
      if (categoryId && f.food_category_id !== categoryId) return false;
      if (q && !f.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [foods, query, categoryId]);

  const filteredDishes = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return dishes;
    return dishes.filter((d) => d.name.toLowerCase().includes(q));
  }, [dishes, query]);

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
          {categoryId && (
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground"
              onClick={() => setCategoryId(null)}
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
            {filteredFoods.map((food) => (
              <button key={food.id} type="button" onClick={() => setSelectedFood(food)}>
                <Card className="h-full card-hover-glow text-left transition-colors hover:border-primary/40">
                  <CardContent className="flex h-full flex-col gap-3">
                    <div className="flex size-10 items-center justify-center rounded-full bg-primary/12 text-primary">
                      <AppleIcon className="size-[18px]" />
                    </div>
                    <div className="mt-auto">
                      <p className="truncate text-sm font-semibold">{food.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {Math.round(food.calories_per_100g)} kcal / 100 g
                      </p>
                      <Badge variant="secondary" className="mt-2">
                        {food.category_name}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </button>
            ))}
          </div>
        )
      ) : filteredDishes.length === 0 ? (
        <EmptyState icon={Utensils} empty={dishes.length === 0} what="platillos" />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredDishes.map((dish) => (
            <Link key={dish.id} href={`/entrenador/nutricion/platillos/${dish.id}`}>
              <Card className="h-full card-hover-glow transition-colors hover:border-primary/40">
                <CardContent className="flex h-full flex-col gap-3">
                  <div className="flex size-10 items-center justify-center rounded-full bg-primary/12 text-primary">
                    <Utensils className="size-[18px]" />
                  </div>
                  <div className="mt-auto">
                    <p className="truncate text-sm font-semibold">{dish.name}</p>
                    <Badge variant="secondary" className="mt-2">
                      {mealTypeLabel(dish.meal_type)}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
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
