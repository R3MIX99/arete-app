"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Search, Plus, Check, Users2, SlidersHorizontal, FilterX } from "lucide-react";
import { toast } from "sonner";

import { mealTypeLabel } from "@/lib/format";
import { foodCategoryIcon, mealTypeIcon } from "@/lib/food-icons";
import { createClient } from "@/lib/supabase/client";
import type {
  CommunityDishOption,
  CommunityFoodOption,
  FoodCategory,
} from "@/lib/types/nutrition";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";

/**
 * Todo lo que cualquier entrenador (o Areté, para los esenciales) ha
 * creado — a diferencia de "Catálogo", que solo muestra lo que este
 * entrenador ya puede usar. Desde aquí se copia un alimento o platillo
 * a tu propio catálogo con "Agregar a mi catálogo".
 */
export function CommunityBrowser({
  trainerId,
  foods,
  dishes,
  categories,
}: {
  trainerId: string;
  foods: CommunityFoodOption[];
  dishes: CommunityDishOption[];
  categories: FoodCategory[];
}) {
  const router = useRouter();
  const [tab, setTab] = React.useState<"foods" | "dishes">("foods");
  const [query, setQuery] = React.useState("");
  const [categoryId, setCategoryId] = React.useState<string | null>(null);
  const [addingId, setAddingId] = React.useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = React.useState(false);

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

  async function addFoodToCatalog(food: CommunityFoodOption) {
    setAddingId(food.id);
    const supabase = createClient();
    const { error } = await supabase.from("foods").insert({
      trainer_id: trainerId,
      forked_from: food.id,
      food_category_id: food.food_category_id,
      name: food.name,
      calories_per_100g: food.calories_per_100g,
      protein_per_100g: food.protein_per_100g,
      carbs_per_100g: food.carbs_per_100g,
      fat_per_100g: food.fat_per_100g,
      household_unit_name: food.household_unit_name,
      household_unit_grams: food.household_unit_grams,
      image_path: food.image_path,
    });
    setAddingId(null);
    if (error) {
      toast.error("No se pudo agregar a tu catálogo");
      return;
    }
    toast.success(`"${food.name}" agregado a tu catálogo`);
    router.refresh();
  }

  async function addDishToCatalog(dish: CommunityDishOption) {
    setAddingId(dish.id);
    const supabase = createClient();
    const { data: newDish, error } = await supabase
      .from("dishes")
      .insert({
        trainer_id: trainerId,
        forked_from: dish.id,
        name: dish.name,
        description: dish.description,
        meal_type: dish.meal_type,
        image_path: dish.image_path,
      })
      .select("id")
      .single();
    if (error || !newDish) {
      setAddingId(null);
      toast.error("No se pudo agregar a tu catálogo");
      return;
    }

    const { data: ingredients, error: ingredientsError } = await supabase
      .from("dish_ingredients")
      .select("food_id, quantity_grams, order_index")
      .eq("dish_id", dish.id);
    if (!ingredientsError && ingredients && ingredients.length > 0) {
      await supabase.from("dish_ingredients").insert(
        ingredients.map((ing: { food_id: string; quantity_grams: number; order_index: number }) => ({
          dish_id: newDish.id,
          food_id: ing.food_id,
          quantity_grams: ing.quantity_grams,
          order_index: ing.order_index,
        })),
      );
    }

    setAddingId(null);
    toast.success(`"${dish.name}" agregado a tu catálogo`);
    router.refresh();
  }

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
          {tab === "foods" && (
            <Button
              variant="outline"
              size="icon"
              aria-label="Filtros"
              className="relative shrink-0"
              onClick={() => setFiltersOpen(true)}
            >
              <SlidersHorizontal className="size-4" />
              {categoryId && (
                <span className="absolute -top-1 -right-1 size-2.5 rounded-full bg-primary" />
              )}
            </Button>
          )}
        </div>
      </div>

      <ResponsiveDialog open={filtersOpen} onOpenChange={setFiltersOpen} title="Filtros">
        <div className="flex flex-wrap gap-2">
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
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="w-fit text-muted-foreground"
          disabled={!categoryId}
          onClick={() => setCategoryId(null)}
        >
          <FilterX /> Limpiar filtros
        </Button>
      </ResponsiveDialog>

      {tab === "foods" ? (
        filteredFoods.length === 0 ? (
          <EmptyState what="alimentos" />
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
            {filteredFoods.map((food) => {
              const Icon = foodCategoryIcon(food.category_slug);
              const imageUrl = food.image_path
                ? createClient().storage.from("food-images").getPublicUrl(food.image_path).data
                    .publicUrl
                : null;
              return (
                <Card key={food.id} className="gap-0 overflow-hidden py-0">
                  <div className="relative aspect-[4/3] w-full bg-primary/12">
                    {imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={imageUrl} alt={food.name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-primary">
                        <Icon className="size-6" />
                      </div>
                    )}
                  </div>
                  <CardContent className="flex flex-col gap-1 px-3 py-2.5">
                    <p className="text-[10px] font-medium tracking-wide text-primary uppercase">
                      {food.category_name}
                    </p>
                    <p className="truncate text-sm font-semibold">{food.name}</p>
                    <p className="truncate text-[11px] text-muted-foreground">
                      Por {food.creator_name}
                    </p>
                    {food.in_my_catalog ? (
                      <Badge variant="secondary" className="mt-1 w-fit gap-1 text-[10px]">
                        <Check className="size-3" /> En tu catálogo
                      </Badge>
                    ) : (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="mt-1"
                        disabled={addingId === food.id}
                        onClick={() => addFoodToCatalog(food)}
                      >
                        <Plus className="size-3.5" /> Agregar
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )
      ) : filteredDishes.length === 0 ? (
        <EmptyState what="platillos" />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
          {filteredDishes.map((dish) => {
            const Icon = mealTypeIcon(dish.meal_type);
            const imageUrl = dish.image_path
              ? createClient().storage.from("food-images").getPublicUrl(dish.image_path).data
                  .publicUrl
              : null;
            return (
              <Card key={dish.id} className="gap-0 overflow-hidden py-0">
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
                <CardContent className="flex flex-col gap-1 px-3 py-2.5">
                  <p className="text-[10px] font-medium tracking-wide text-primary uppercase">
                    {mealTypeLabel(dish.meal_type)}
                  </p>
                  <p className="truncate text-sm font-semibold">{dish.name}</p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    Por {dish.creator_name}
                  </p>
                  {dish.in_my_catalog ? (
                    <Badge variant="secondary" className="mt-1 w-fit gap-1 text-[10px]">
                      <Check className="size-3" /> En tu catálogo
                    </Badge>
                  ) : (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="mt-1"
                      disabled={addingId === dish.id}
                      onClick={() => addDishToCatalog(dish)}
                    >
                      <Plus className="size-3.5" /> Agregar
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function EmptyState({ what }: { what: string }) {
  return (
    <div className="flex flex-col items-center gap-2 py-16 text-center text-muted-foreground">
      <Users2 className="size-8" />
      <p className="text-sm">Ningún {what.slice(0, -1)} coincide con la búsqueda o los filtros.</p>
    </div>
  );
}
