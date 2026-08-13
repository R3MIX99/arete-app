"use client";

import * as React from "react";
import { Search, Utensils } from "lucide-react";

import { mealTypeLabel } from "@/lib/format";
import type { DishOption } from "@/lib/types/nutrition";
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
  onPick,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dishes: DishOption[];
  onPick: (dish: DishOption) => void;
}) {
  const [query, setQuery] = React.useState("");

  const filtered = dishes.filter((d) =>
    d.name.toLowerCase().includes(query.trim().toLowerCase()),
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Elegir platillo</DialogTitle>
        </DialogHeader>
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
              {dishes.length === 0
                ? "Todavía no tienes platillos en tu catálogo."
                : "Ningún platillo coincide con la búsqueda."}
            </p>
          ) : (
            filtered.map((dish) => (
              <button
                key={dish.id}
                type="button"
                onClick={() => {
                  onPick(dish);
                  onOpenChange(false);
                  setQuery("");
                }}
                className="flex items-center gap-3 rounded-lg border border-transparent px-3 py-2 text-left transition-colors hover:border-border hover:bg-accent"
              >
                <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/12 text-primary">
                  <Utensils className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{dish.name}</p>
                  <Badge variant="secondary" className="mt-0.5 text-[10px]">
                    {mealTypeLabel(dish.meal_type)}
                  </Badge>
                </div>
              </button>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
