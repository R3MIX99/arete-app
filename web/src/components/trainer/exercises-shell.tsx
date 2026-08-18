"use client";

import type { CommunityExerciseOption, ExerciseSummary } from "@/lib/types/exercise";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ExercisesBrowser } from "@/components/trainer/exercises-browser";
import { ExerciseCommunityBrowser } from "@/components/trainer/exercise-community-browser";

/**
 * "Mi biblioteca" = lo que este entrenador puede usar directamente al
 * armar una rutina (los esenciales de Aretia + lo suyo). Comunidad =
 * todo lo que cualquier entrenador ha creado, para poder copiarlo a tu
 * biblioteca — mismo patrón que Catálogo/Comunidad en Nutrición.
 */
export function ExercisesShell({
  exercises,
  communityExercises,
  trainerId,
}: {
  exercises: ExerciseSummary[];
  communityExercises: CommunityExerciseOption[];
  trainerId: string;
}) {
  return (
    <div className="flex w-full flex-col gap-4 p-4 pb-24 md:p-8">
      <Tabs defaultValue="biblioteca">
        <TabsList>
          <TabsTrigger value="biblioteca">Mi biblioteca</TabsTrigger>
          <TabsTrigger value="comunidad">Comunidad</TabsTrigger>
        </TabsList>
        <TabsContent value="biblioteca">
          <ExercisesBrowser exercises={exercises} trainerId={trainerId} />
        </TabsContent>
        <TabsContent value="comunidad">
          <ExerciseCommunityBrowser exercises={communityExercises} trainerId={trainerId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
