"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, PlayCircle } from "lucide-react";

import { ExerciseDetailDialog } from "@/components/client/exercise-detail-dialog";
import { RoutineExerciseCard } from "@/components/client/routine-exercise-card";
import { Button } from "@/components/ui/button";
import type { SessionExerciseInfo } from "@/lib/types/client-panel";

export function RoutinePreviewView({
  routineName,
  routineDescription,
  exercises,
  startHref,
}: {
  routineName: string;
  routineDescription: string | null;
  exercises: SessionExerciseInfo[];
  startHref: string;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<SessionExerciseInfo | null>(null);

  return (
    <div className="mx-auto flex max-w-md flex-col gap-4 pb-28">
      <div className="sticky top-0 z-10 flex items-center gap-3 border-b bg-background/95 px-4 py-3 backdrop-blur-sm">
        <Button variant="ghost" size="icon" className="shrink-0" onClick={() => router.back()} aria-label="Regresar">
          <ChevronLeft className="size-5" />
        </Button>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{routineName}</p>
          <p className="text-xs text-muted-foreground">
            {exercises.length} ejercicio{exercises.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-3 px-4">
        {routineDescription ? <p className="text-sm text-muted-foreground">{routineDescription}</p> : null}

        <div className="flex flex-col gap-3">
          {exercises.map((exercise) => (
            <RoutineExerciseCard
              key={exercise.id}
              exercise={exercise}
              onSelect={() => setSelected(exercise)}
            />
          ))}
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t bg-background/95 p-4 backdrop-blur-sm">
        <Button asChild className="mx-auto w-full max-w-md" size="lg">
          <Link href={startHref}>
            <PlayCircle className="size-4" />
            Iniciar entrenamiento
          </Link>
        </Button>
      </div>

      <ExerciseDetailDialog exercise={selected} open={selected !== null} onOpenChange={(open) => !open && setSelected(null)} />
    </div>
  );
}
