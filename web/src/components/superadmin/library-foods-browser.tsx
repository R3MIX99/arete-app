"use client";

import * as React from "react";
import Link from "next/link";
import { Search, Plus, Apple } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { foodCategoryIcon } from "@/lib/food-icons";
import type { FoodOption } from "@/lib/types/nutrition";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export function LibraryFoodsBrowser({ foods }: { foods: FoodOption[] }) {
  const [query, setQuery] = React.useState("");

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return foods;
    return foods.filter((f) => f.name.toLowerCase().includes(q));
  }, [foods, query]);

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
        <Button asChild className="ml-auto">
          <Link href="/superadmin/biblioteca/alimentos/nuevo">
            <Plus /> Nuevo alimento
          </Link>
        </Button>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-16 text-center text-muted-foreground">
          <Apple className="size-8" />
          <p className="text-sm">
            {foods.length === 0
              ? "Todavía no hay alimentos en el catálogo de Aretia."
              : "Ningún alimento coincide con la búsqueda."}
          </p>
        </div>
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
