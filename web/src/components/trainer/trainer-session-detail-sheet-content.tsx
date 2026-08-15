"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Clock, History, Loader2, Minus, Target } from "lucide-react";
import Link from "next/link";

import { createClient } from "@/lib/supabase/client";
import { fetchCompletedSessionView, type CompletedSessionView } from "@/lib/server/completed-session-view";
import { cn } from "@/lib/utils";
import { ExerciseVideoButton } from "@/components/client/exercise-video-button";

function isCardio(muscleGroup: string) {
  return muscleGroup === "cardio";
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return "";
  const m = Math.round(seconds / 60);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem > 0 ? `${h} h ${rem} min` : `${h} h`;
}

/** Contenido del sheet flotante de detalle de una sesión ya completada
 * por un cliente — misma información que la página de solo lectura,
 * pero cargada en el navegador para poder mostrarse dentro del panel
 * sin navegar a otra página. Se arma a partir de lo que el cliente
 * realmente registró (client_set_logs), no de la rutina vigente — así
 * sigue viéndose igual aunque el entrenador después edite o borre esa
 * rutina. */
export function TrainerSessionDetailSheetContent({
  clientId,
  sessionId,
}: {
  clientId: string;
  sessionId: string;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<CompletedSessionView | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const data = await fetchCompletedSessionView(supabase, sessionId, clientId);
      if (cancelled) return;
      setView(data);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase, clientId, sessionId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const exercises = view?.exercises ?? [];
  const totalSets = exercises.reduce((acc, e) => acc + e.sets.length, 0);
  const completedSets = exercises.reduce(
    (acc, e) => acc + e.sets.filter((s) => s.isCompleted).length,
    0,
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 divide-x rounded-xl border">
        <div className="flex flex-col items-center gap-1 px-4 py-3">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Clock className="size-3.5" />
            <span className="text-[11px] font-medium uppercase tracking-wide">Duración</span>
          </div>
          <p className="text-lg font-semibold tabular-nums">
            {view?.durationSeconds ? formatDuration(view.durationSeconds) : "—"}
          </p>
        </div>
        <div className="flex flex-col items-center gap-1 px-4 py-3">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Target className="size-3.5" />
            <span className="text-[11px] font-medium uppercase tracking-wide">Series</span>
          </div>
          <p className="text-lg font-semibold tabular-nums">
            {completedSets}/{totalSets}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {exercises.map((exercise) => {
          const cardio = isCardio(exercise.muscleGroup);
          return (
            <div key={exercise.exerciseId} className="overflow-hidden rounded-xl border">
              <div className="flex items-center gap-2 border-b bg-foreground/[0.02] px-4 py-3">
                <p className="min-w-0 flex-1 truncate text-sm font-medium">{exercise.exerciseName}</p>
                {exercise.videoUrl ? (
                  <ExerciseVideoButton videoUrl={exercise.videoUrl} exerciseName={exercise.exerciseName} />
                ) : null}
                <Link
                  href={`/entrenador/clientes/${clientId}/ejercicio/${exercise.exerciseId}?name=${encodeURIComponent(exercise.exerciseName)}&muscle=${encodeURIComponent(exercise.muscleGroup)}`}
                  className="shrink-0 text-muted-foreground hover:text-foreground"
                  aria-label={`Ver historial de ${exercise.exerciseName}`}
                >
                  <History className="size-4.5" />
                </Link>
              </div>
              <div className="px-4 py-3">
                <div className="grid grid-cols-[1.5rem_1fr_1fr_1.5rem] items-center gap-2 pb-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  <span>#</span>
                  <span>{cardio ? "Minutos" : "Peso"}</span>
                  <span>{cardio ? "Nivel" : "Reps"}</span>
                  <span />
                </div>
                <div className="flex flex-col gap-1.5">
                  {exercise.sets.map((set, i) => (
                    <div key={i} className="grid grid-cols-[1.5rem_1fr_1fr_1.5rem] items-center gap-2 text-sm">
                      <span className="text-muted-foreground">{set.setNumber}</span>
                      <span className="tabular-nums">
                        {cardio
                          ? (set.actualMinutes ? `${set.actualMinutes} min` : "—")
                          : set.actualWeight
                            ? `${set.actualWeight} kg`
                            : "—"}
                      </span>
                      <span className="tabular-nums">
                        {cardio ? (set.actualLevel ?? "—") : (set.actualReps ?? "—")}
                      </span>
                      {set.isCompleted ? (
                        <Check className="size-4 text-primary" />
                      ) : (
                        <Minus className={cn("size-4 text-muted-foreground/40")} />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
