"use client";

import { ChevronRight, Dumbbell } from "lucide-react";

import { ThumbnailImage } from "@/components/client/thumbnail-image";
import type { SessionExerciseInfo } from "@/lib/types/client-panel";

/** "2 series | 6 - 8 repeticiones", o su equivalente de cardio
 * ("1 serie | 20 min"). Se toma la primera serie como referencia: en la
 * práctica un ejercicio se arma con el mismo objetivo en todas. */
function targetLabel(exercise: SessionExerciseInfo): string {
  const setCount = exercise.sets.length;
  const seriesLabel = `${setCount} serie${setCount === 1 ? "" : "s"}`;
  const first = exercise.sets[0];
  if (!first) return seriesLabel;

  if (first.target_minutes !== null) {
    return `${seriesLabel} | ${first.target_minutes} min`;
  }
  const min = first.target_reps_min;
  const max = first.target_reps_max;
  if (min === null && max === null) return seriesLabel;
  const reps = min !== null && max !== null && min !== max ? `${min} - ${max}` : `${min ?? max}`;
  return `${seriesLabel} | ${reps} repeticiones`;
}

/**
 * Tarjeta de un ejercicio dentro de la vista previa de la rutina: foto
 * a la izquierda, nombre, el objetivo en un chip, y el descanso abajo
 * con el chevron que abre el detalle del ejercicio.
 */
export function RoutineExerciseCard({
  exercise,
  onSelect,
}: {
  exercise: SessionExerciseInfo;
  onSelect: () => void;
}) {
  const restSeconds = exercise.sets[0]?.rest_seconds ?? null;

  return (
    <button type="button" onClick={onSelect} className="w-full text-left">
      <div className="flex gap-3 rounded-2xl bg-card p-2.5 transition-colors hover:bg-accent/40">
        <div className="size-[72px] shrink-0 overflow-hidden rounded-xl bg-primary/12">
          {exercise.image_url ? (
            <ThumbnailImage
              src={exercise.image_url}
              fallbackSrc={exercise.image_fallback_url}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-primary">
              <Dumbbell className="size-6" />
            </div>
          )}
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <p className="text-sm leading-snug font-semibold">{exercise.exercise_name}</p>
          <span className="w-fit rounded-full bg-primary px-2.5 py-0.5 text-[11px] font-semibold text-primary-foreground">
            {targetLabel(exercise)}
          </span>
          <div className="mt-auto flex items-end justify-between gap-2">
            <span className="text-xs text-muted-foreground">
              {restSeconds !== null ? `${restSeconds}" de descanso` : ""}
            </span>
            <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
          </div>
        </div>
      </div>
    </button>
  );
}
