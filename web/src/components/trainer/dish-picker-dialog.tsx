"use client";

import * as React from "react";
import { Search, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { mealTypeLabel } from "@/lib/format";
import { mealTypeIcon } from "@/lib/food-icons";
import { createClient } from "@/lib/supabase/client";
import type { CommunityDishOption, DishOption } from "@/lib/types/nutrition";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export function DishPickerDialog({
  open,
  onOpenChange,
  dishes,
  communityDishes,
  trainerId,
  onPick,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dishes: DishOption[];
  // Si se pasan junto con trainerId, aparece una pestaña "Comunidad"
  // que copia el platillo elegido (con sus ingredientes) a tu catálogo
  // antes de usarlo.
  communityDishes?: CommunityDishOption[];
  trainerId?: string;
  onPick: (dish: DishOption) => void;
}) {
  const showCommunityTab = Boolean(communityDishes && trainerId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Elegir platillo</DialogTitle>
        </DialogHeader>
        {/* Se monta sólo mientras el diálogo está abierto: así la búsqueda
         * y la pestaña seleccionada siempre arrancan limpias, sin
         * necesitar un efecto que sincronice el estado al abrir. */}
        {open && (
          <DishPickerDialogBody
            dishes={dishes}
            communityDishes={communityDishes}
            trainerId={trainerId}
            showCommunityTab={showCommunityTab}
            onPick={onPick}
            onOpenChange={onOpenChange}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function DishPickerDialogBody({
  dishes,
  communityDishes,
  trainerId,
  showCommunityTab,
  onPick,
  onOpenChange,
}: {
  dishes: DishOption[];
  communityDishes?: CommunityDishOption[];
  trainerId?: string;
  showCommunityTab: boolean;
  onPick: (dish: DishOption) => void;
  onOpenChange: (open: boolean) => void;
}) {
  const [query, setQuery] = React.useState("");
  const [source, setSource] = React.useState<"mine" | "community">("mine");
  const [addingId, setAddingId] = React.useState<string | null>(null);

  const communityOnly = (communityDishes ?? []).filter((d) => !d.in_my_catalog);

  const filtered = (source === "mine" ? dishes : communityOnly).filter((d) =>
    d.name.toLowerCase().includes(query.trim().toLowerCase()),
  );

  async function pickCommunityDish(dish: CommunityDishOption) {
    if (!trainerId) return;
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

    const { data: ingredients } = await supabase
      .from("dish_ingredients")
      .select("food_id, quantity_grams, order_index")
      .eq("dish_id", dish.id);
    if (ingredients && ingredients.length > 0) {
      await supabase.from("dish_ingredients").insert(
        ingredients.map(
          (ing: { food_id: string; quantity_grams: number; order_index: number }) => ({
            dish_id: newDish.id,
            food_id: ing.food_id,
            quantity_grams: ing.quantity_grams,
            order_index: ing.order_index,
          }),
        ),
      );
    }

    setAddingId(null);
    toast.success(`"${dish.name}" agregado a tu catálogo`);
    onPick({ ...dish, id: newDish.id, trainer_id: trainerId, forked_from: dish.id });
    onOpenChange(false);
  }

  return (
    <>
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
          placeholder="Buscar platillo por nombre"
          className="pl-9"
        />
      </div>
      <div className="flex max-h-80 flex-col gap-1.5 overflow-y-auto">
        {filtered.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            {source === "mine" && dishes.length === 0
              ? "Todavía no tienes platillos en tu catálogo."
              : "Ningún platillo coincide con la búsqueda."}
          </p>
        ) : (
          filtered.map((dish) => {
            const isCommunity = source === "community";
            const communityDish = dish as CommunityDishOption;
            return (
              <DishPickerRow
                key={dish.id}
                dish={dish}
                isCommunity={isCommunity}
                communityDish={isCommunity ? communityDish : undefined}
                adding={addingId === dish.id}
                onSelect={() => {
                  if (isCommunity) {
                    void pickCommunityDish(communityDish);
                    return;
                  }
                  onPick(dish);
                  onOpenChange(false);
                }}
              />
            );
          })
        )}
      </div>
    </>
  );
}

function DishPickerRow({
  dish,
  isCommunity,
  communityDish,
  adding,
  onSelect,
}: {
  dish: DishOption;
  isCommunity: boolean;
  communityDish?: CommunityDishOption;
  adding: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      disabled={adding}
      onClick={onSelect}
      className="flex items-center gap-3 rounded-lg border border-transparent px-3 py-2 text-left transition-colors hover:border-border hover:bg-accent disabled:opacity-60"
    >
      <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/12 text-primary">
        {adding
          ? // `mealTypeIcon` elige el ícono dinámicamente; se invoca con
            // React.createElement (no como tag JSX <Icon/>) porque el ícono
            // no es una referencia estable entre renders y usarlo como tag
            // dispara "Cannot create components during render".
            <Loader2 className="size-4 animate-spin" />
          : React.createElement(mealTypeIcon(dish.meal_type), { className: "size-4" })}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{dish.name}</p>
        <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
          <Badge variant="secondary" className="text-[10px]">
            {mealTypeLabel(dish.meal_type)}
          </Badge>
          {isCommunity && communityDish && (
            <span className="text-[11px] text-muted-foreground">
              Por {communityDish.creator_name}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
