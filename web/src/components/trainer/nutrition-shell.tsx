"use client";

import * as React from "react";

import type {
  CommunityDishOption,
  CommunityFoodOption,
  DietPlanSummary,
  DishOption,
  FoodCategory,
  FoodOption,
} from "@/lib/types/nutrition";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { DietPlansBrowser } from "@/components/trainer/diet-plans-browser";
import { CatalogBrowser } from "@/components/trainer/catalog-browser";
import { CommunityBrowser } from "@/components/trainer/community-browser";

/**
 * "Planes Nutricionales" agrupa tres pestañas — Planes, Catálogo y
 * Comunidad — en un solo ítem de la barra lateral, igual que en
 * Flutter, para no tener que tocar los 9 módulos fijos del panel.
 *
 * Catálogo = lo que este entrenador puede usar directamente al armar un
 * plan (los esenciales de Areté + lo suyo). Comunidad = todo lo que
 * cualquier entrenador ha creado, para poder copiarlo a tu catálogo.
 */
export function NutritionShell({
  trainerId,
  dietPlans,
  foods,
  dishes,
  communityFoods,
  communityDishes,
  categories,
}: {
  trainerId: string;
  dietPlans: DietPlanSummary[];
  foods: FoodOption[];
  dishes: DishOption[];
  communityFoods: CommunityFoodOption[];
  communityDishes: CommunityDishOption[];
  categories: FoodCategory[];
}) {
  return (
    <div className="flex w-full flex-col gap-4 p-4 pb-24 md:p-8">
      <Tabs defaultValue="planes">
        <TabsList>
          <TabsTrigger value="planes">Planes</TabsTrigger>
          <TabsTrigger value="catalogo">Catálogo</TabsTrigger>
          <TabsTrigger value="comunidad">Comunidad</TabsTrigger>
        </TabsList>
        <TabsContent value="planes">
          <DietPlansBrowser dietPlans={dietPlans} />
        </TabsContent>
        <TabsContent value="catalogo">
          <CatalogBrowser
            trainerId={trainerId}
            foods={foods}
            dishes={dishes}
            categories={categories}
          />
        </TabsContent>
        <TabsContent value="comunidad">
          <CommunityBrowser
            trainerId={trainerId}
            foods={communityFoods}
            dishes={communityDishes}
            categories={categories}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
