"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Dumbbell, PlayCircle } from "lucide-react";

import { ExerciseDetailDialog } from "@/components/client/exercise-detail-dialog";
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

        <div className="flex flex-col gap-2">
          {exercises.map((exercise) => (
            <button key={exercise.id} type="button" onClick={() => setSelected(exercise)} className="text-left">
              <div className="glass-card flex items-center gap-3 rounded-xl p-4 transition-colors hover:bg-accent/40">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Dumbbell className="size-4.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{exercise.exercise_name}</p>
                  <p className="text-xs text-muted-foreground">{exercise.sets.length} series</p>
                </div>
                <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
              </div>
            </button>
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
