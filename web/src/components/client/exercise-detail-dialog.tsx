"use client";

import Link from "next/link";
import { History } from "lucide-react";

import { youtubeVideoId } from "@/lib/youtube";
import { isCardioGroup } from "@/lib/client-exercise-target";
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
  const cardio = exercise ? isCardioGroup(exercise.muscle_group) : false;

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
          ) : exercise.image_url ? (
            // Sin video, la foto del ejercicio al menos deja ver de qué
            // movimiento se trata.
            <div className="aspect-video w-full overflow-hidden rounded-lg border border-border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={exercise.image_url}
                alt={exercise.exercise_name}
                className="h-full w-full object-cover"
              />
            </div>
          ) : null}

          <div className="flex flex-col gap-1.5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Objetivo</p>
            {exercise.sets.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin series definidas</p>
            ) : (
              <div className="overflow-hidden rounded-lg border border-border">
                <div className="grid grid-cols-[2.5rem_1fr_1fr] gap-2 bg-muted px-3 py-1.5 text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                  <span>Serie</span>
                  <span>{cardio ? "Minutos" : "Reps"}</span>
                  <span>{cardio ? "Nivel" : "Descanso"}</span>
                </div>
                <div className="divide-y divide-border">
                  {exercise.sets.map((set) => (
                    <div
                      key={set.id}
                      className="grid grid-cols-[2.5rem_1fr_1fr] items-center gap-2 px-3 py-2 text-sm"
                    >
                      <span className="font-medium tabular-nums">{set.set_number}</span>
                      {cardio ? (
                        <>
                          <span className="tabular-nums">
                            {set.target_minutes != null ? `${set.target_minutes} min` : "—"}
                          </span>
                          <span className="tabular-nums">{set.target_level ?? "—"}</span>
                        </>
                      ) : (
                        <>
                          <span className="tabular-nums">
                            {set.target_reps_min != null && set.target_reps_max != null
                              ? set.target_reps_min === set.target_reps_max
                                ? `${set.target_reps_min}`
                                : `${set.target_reps_min}-${set.target_reps_max}`
                              : "—"}
                          </span>
                          <span className="tabular-nums">
                            {set.rest_seconds != null ? `${set.rest_seconds}s` : "—"}
                          </span>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {exercise.exercise_description ? (
            <p className="text-sm text-muted-foreground">{exercise.exercise_description}</p>
          ) : null}

          {exercise.notes ? (
            <div className="rounded-lg bg-primary/8 px-3 py-2.5">
              <p className="text-xs font-medium text-primary uppercase tracking-wide">
                Instrucciones del entrenador
              </p>
              <p className="text-sm">{exercise.notes}</p>
            </div>
          ) : null}

          <Button asChild type="button" variant="outline" size="sm" className="w-fit gap-2">
            <Link
              href={`/cliente/entrenamiento/evolucion/${exercise.exercise_id}?name=${encodeURIComponent(exercise.exercise_name)}&muscle=${encodeURIComponent(exercise.muscle_group)}`}
            >
              <History className="size-4" />
              Ver historial
            </Link>
          </Button>
        </div>
      ) : null}
    </ResponsiveDialog>
  );
}
