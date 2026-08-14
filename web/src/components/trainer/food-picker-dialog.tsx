"use client";

import * as React from "react";
import { Search, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { foodCategoryIcon } from "@/lib/food-icons";
import { createClient } from "@/lib/supabase/client";
import type { CommunityFoodOption, FoodOption } from "@/lib/types/nutrition";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export function FoodPickerDialog({
  open,
  onOpenChange,
  foods,
  communityFoods,
  trainerId,
  onPick,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  foods: FoodOption[];
  // Si se pasan junto con trainerId, aparece una pestaña "Comunidad"
  // que copia el alimento elegido a tu catálogo antes de usarlo.
  communityFoods?: CommunityFoodOption[];
  trainerId?: string;
  onPick: (food: FoodOption) => void;
}) {
  const [query, setQuery] = React.useState("");
  const [source, setSource] = React.useState<"mine" | "community">("mine");
  const [addingId, setAddingId] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open) {
      setQuery("");
      setSource("mine");
    }
  }, [open]);

  const showCommunityTab = Boolean(communityFoods && trainerId);
  const communityOnly = (communityFoods ?? []).filter((f) => !f.in_my_catalog);

  const filtered = (source === "mine" ? foods : communityOnly).filter((f) =>
    f.name.toLowerCase().includes(query.trim().toLowerCase()),
  );

  async function pickCommunityFood(food: CommunityFoodOption) {
    if (!trainerId) return;
    setAddingId(food.id);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("foods")
      .insert({
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
      })
      .select("id")
      .single();
    setAddingId(null);
    if (error || !data) {
      toast.error("No se pudo agregar a tu catálogo");
      return;
    }
    toast.success(`"${food.name}" agregado a tu catálogo`);
    onPick({ ...food, id: data.id, trainer_id: trainerId, forked_from: food.id });
    onOpenChange(false);
    setQuery("");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Elegir alimento</DialogTitle>
        </DialogHeader>

        {showCommunityTab && (
          <div className="inline-flex w-fit rounded-lg bg-foreground/[0.04] p-1">
            <button
              type="button"
              onClick={() => setSource("mine")}
              className={
                source === "mine"
                  ? "rounded-md bg-card px-3 py-1.5 text-sm font-medium shadow-sm"
                  : "rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
              }
            >
              Mi catálogo
            </button>
            <button
              type="button"
              onClick={() => setSource("community")}
              className={
                source === "community"
                  ? "rounded-md bg-card px-3 py-1.5 text-sm font-medium shadow-sm"
                  : "rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
              }
            >
              Comunidad
            </button>
          </div>
        )}

        <div className="relative">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar alimento por nombre"
            className="pl-9"
          />
        </div>
        <div className="flex max-h-80 flex-col gap-1.5 overflow-y-auto">
          {filtered.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Ningún alimento coincide con la búsqueda.
            </p>
          ) : (
            filtered.map((food) => {
              const Icon = foodCategoryIcon(food.category_slug);
              const isCommunity = source === "community";
              const communityFood = food as CommunityFoodOption;
              return (
                <button
                  key={food.id}
                  type="button"
                  disabled={addingId === food.id}
                  onClick={() => {
                    if (isCommunity) {
                      void pickCommunityFood(communityFood);
                      return;
                    }
                    onPick(food);
                    onOpenChange(false);
                    setQuery("");
                  }}
                  className="flex items-center gap-3 rounded-lg border border-transparent px-3 py-2 text-left transition-colors hover:border-border hover:bg-accent disabled:opacity-60"
                >
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/12 text-primary">
                    {addingId === food.id ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Icon className="size-4" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{food.name}</p>
                    <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                      <Badge variant="secondary" className="text-[10px]">
                        {food.category_name}
                      </Badge>
                      <span className="text-[11px] text-muted-foreground">
                        {Math.round(food.calories_per_100g)} kcal/100g
                      </span>
                      {isCommunity && (
                        <span className="text-[11px] text-muted-foreground">
                          · Por {communityFood.creator_name}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
