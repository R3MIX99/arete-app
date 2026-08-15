"use client";

import { useState } from "react";
import { History } from "lucide-react";

import { youtubeVideoId } from "@/lib/youtube";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { Button } from "@/components/ui/button";
import { ExerciseHistoryList } from "@/components/client/exercise-history";
import type { SessionExerciseInfo } from "@/lib/types/client-panel";

function isCardio(muscleGroup: string) {
  return muscleGroup === "cardio";
}

/** Línea "2 series de 8-12 repeticiones, 90s de descanso" (o su
 * equivalente en minutos/nivel si es cardio) a partir de las series
 * objetivo de la rutina. */
function summarizeTarget(exercise: SessionExerciseInfo): string {
  const { sets } = exercise;
  if (sets.length === 0) return "Sin series definidas";
  const setLabel = `${sets.length} serie${sets.length > 1 ? "s" : ""}`;

  if (isCardio(exercise.muscle_group)) {
    const minutes = sets.map((s) => s.target_minutes).filter((v): v is number => v != null);
    const levels = sets.map((s) => s.target_level).filter((v): v is number => v != null);
    const minutesLabel = minutes.length
      ? Math.min(...minutes) === Math.max(...minutes)
        ? `${minutes[0]} min`
        : `${Math.min(...minutes)}-${Math.max(...minutes)} min`
      : null;
    const levelLabel = levels.length
      ? Math.min(...levels) === Math.max(...levels)
        ? `nivel ${levels[0]}`
        : `nivel ${Math.min(...levels)}-${Math.max(...levels)}`
      : null;
    return [setLabel, minutesLabel, levelLabel].filter(Boolean).join(" de ");
  }

  const repsMin = sets.map((s) => s.target_reps_min).filter((v): v is number => v != null);
  const repsMax = sets.map((s) => s.target_reps_max).filter((v): v is number => v != null);
  const rest = sets.map((s) => s.rest_seconds).filter((v): v is number => v != null);
  const repsLabel =
    repsMin.length && repsMax.length
      ? Math.min(...repsMin) === Math.max(...repsMax)
        ? `${Math.min(...repsMin)} reps`
        : `${Math.min(...repsMin)}-${Math.max(...repsMax)} reps`
      : null;
  const restLabel = rest.length ? `${Math.max(...rest)}s de descanso` : null;
  return [setLabel, repsLabel && `de ${repsLabel}`, restLabel && `con ${restLabel}`].filter(Boolean).join(" ");
}

export function ExerciseDetailDialog({
  exercise,
  open,
  onOpenChange,
}: {
  exercise: SessionExerciseInfo | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [showHistory, setShowHistory] = useState(false);
  const videoId = exercise?.video_url ? youtubeVideoId(exercise.video_url) : null;

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) setShowHistory(false);
      }}
      title={exercise?.exercise_name ?? ""}
    >
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

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-fit gap-2"
            onClick={() => setShowHistory((v) => !v)}
          >
            <History className="size-4" />
            {showHistory ? "Ocultar historial" : "Ver historial"}
          </Button>

          {showHistory ? (
            <ExerciseHistoryList exercise={exercise} cardio={isCardio(exercise.muscle_group)} />
          ) : null}
        </div>
      ) : null}
    </ResponsiveDialog>
  );
}
