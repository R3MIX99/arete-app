"use client";

import Link from "next/link";
import { History } from "lucide-react";

import { youtubeVideoId } from "@/lib/youtube";
import { summarizeTarget } from "@/lib/client-exercise-target";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { Button } from "@/components/ui/button";
import type { SessionExerciseInfo } from "@/lib/types/client-panel";

export function ExerciseDetailDialog({
  exercise,
  open,
  onOpenChange,
}: {
  exercise: SessionExerciseInfo | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const videoId = exercise?.video_url ? youtubeVideoId(exercise.video_url) : null;

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange} title={exercise?.exercise_name ?? ""}>
      {exercise ? (
        <div className="flex flex-col gap-4">
          {videoId ? (
            <div className="aspect-video w-full overflow-hidden rounded-lg border border-border">
              <iframe
                className="size-full"
                src={`https://www.youtube.com/embed/${videoId}`}
                title={exercise.exercise_name}
                allowFullScreen
              />
            </div>
          ) : null}

          <div className="rounded-lg bg-muted px-3 py-2.5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Objetivo</p>
            <p className="text-sm font-medium">{summarizeTarget(exercise)}</p>
          </div>

          {exercise.exercise_description ? (
            <p className="text-sm text-muted-foreground">{exercise.exercise_description}</p>
          ) : null}

          {exercise.notes ? (
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Nota del entrenador: </span>
              {exercise.notes}
            </p>
          ) : null}

          <Button asChild type="button" variant="outline" size="sm" className="w-fit gap-2">
            <Link href={`/cliente/entrenamiento/ejercicio-historial/${exercise.id}`}>
              <History className="size-4" />
              Ver historial
            </Link>
          </Button>
        </div>
      ) : null}
    </ResponsiveDialog>
  );
}
