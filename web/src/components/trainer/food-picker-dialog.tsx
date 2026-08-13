"use client";

import * as React from "react";
import { Search, Apple } from "lucide-react";

import type { FoodOption } from "@/lib/types/nutrition";
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
  onPick,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  foods: FoodOption[];
  onPick: (food: FoodOption) => void;
}) {
  const [query, setQuery] = React.useState("");

  const filtered = foods.filter((f) =>
    f.name.toLowerCase().includes(query.trim().toLowerCase()),
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Elegir alimento</DialogTitle>
        </DialogHeader>
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
            filtered.map((food) => (
              <button
                key={food.id}
                type="button"
                onClick={() => {
                  onPick(food);
                  onOpenChange(false);
                  setQuery("");
                }}
                className="flex items-center gap-3 rounded-lg border border-transparent px-3 py-2 text-left transition-colors hover:border-border hover:bg-accent"
              >
                <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/12 text-primary">
                  <Apple className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{food.name}</p>
                  <div className="mt-0.5 flex gap-1.5">
                    <Badge variant="secondary" className="text-[10px]">
                      {food.category_name}
                    </Badge>
                    <span className="text-[11px] text-muted-foreground">
                      {Math.round(food.calories_per_100g)} kcal/100g
                    </span>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
