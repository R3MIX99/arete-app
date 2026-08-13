"use client";

import * as React from "react";

import type { DietPlanSummary, DishOption, FoodCategory, FoodOption } from "@/lib/types/nutrition";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { DietPlansBrowser } from "@/components/trainer/diet-plans-browser";
import { CatalogBrowser } from "@/components/trainer/catalog-browser";

/**
 * "Planes Nutricionales" agrupa dos pestañas — Planes y Catálogo — en un
 * solo ítem de la barra lateral, igual que en Flutter, para no tener que
 * tocar los 9 módulos fijos del panel.
 */
export function NutritionShell({
  dietPlans,
  foods,
  dishes,
  categories,
}: {
  dietPlans: DietPlanSummary[];
  foods: FoodOption[];
  dishes: DishOption[];
  categories: FoodCategory[];
}) {
  return (
    <div className="flex w-full flex-col gap-4 p-4 pb-24 md:p-8">
      <Tabs defaultValue="planes">
        <TabsList>
          <TabsTrigger value="planes">Planes</TabsTrigger>
          <TabsTrigger value="catalogo">Catálogo</TabsTrigger>
        </TabsList>
        <TabsContent value="planes">
          <DietPlansBrowser dietPlans={dietPlans} />
        </TabsContent>
        <TabsContent value="catalogo">
          <CatalogBrowser foods={foods} dishes={dishes} categories={categories} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
