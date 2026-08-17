"use client";

import type { ExerciseSummary } from "@/lib/types/exercise";
import type { DishOption, FoodOption } from "@/lib/types/nutrition";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { LibraryExercisesBrowser } from "@/components/superadmin/library-exercises-browser";
import { LibraryFoodsBrowser } from "@/components/superadmin/library-foods-browser";
import { LibraryDishesBrowser } from "@/components/superadmin/library-dishes-browser";

/**
 * Biblioteca de Areté: el catálogo global (trainer_id null) que ve
 * cualquier entrenador en su biblioteca/catálogo. Solo el superadmin
 * puede crear, editar o borrar aquí — un entrenador solo puede
 * copiarlo a lo suyo, nunca tocar el original.
 */
export function LibraryShell({
  exercises,
  foods,
  dishes,
}: {
  exercises: ExerciseSummary[];
  foods: FoodOption[];
  dishes: DishOption[];
}) {
  return (
    <div className="flex w-full flex-col gap-4 p-4 pb-24 md:p-8">
      <div>
        <h1 className="text-xl font-semibold">Biblioteca de Areté</h1>
        <p className="text-sm text-muted-foreground">
          El catálogo global que ven todos los entrenadores. Súbele imágenes, video y edítalo
          desde aquí.
        </p>
      </div>
      <Tabs defaultValue="ejercicios">
        <TabsList>
          <TabsTrigger value="ejercicios">Ejercicios</TabsTrigger>
          <TabsTrigger value="alimentos">Alimentos</TabsTrigger>
          <TabsTrigger value="platillos">Platillos</TabsTrigger>
        </TabsList>
        <TabsContent value="ejercicios">
          <LibraryExercisesBrowser exercises={exercises} />
        </TabsContent>
        <TabsContent value="alimentos">
          <LibraryFoodsBrowser foods={foods} />
        </TabsContent>
        <TabsContent value="platillos">
          <LibraryDishesBrowser dishes={dishes} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
