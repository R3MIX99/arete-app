"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Clock, Loader2, Minus, Target } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { fetchRoutineSessionData } from "@/lib/server/client-routine-data";
import { cn } from "@/lib/utils";
import { ExerciseVideoButton } from "@/components/client/exercise-video-button";
import type { SessionExerciseInfo, SessionSetLog } from "@/lib/types/client-panel";

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
 * sin navegar a otra página. */
export function TrainerSessionDetailSheetContent({
  clientId,
  sessionId,
}: {
  clientId: string;
  sessionId: string;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [loading, setLoading] = useState(true);
  const [durationSeconds, setDurationSeconds] = useState<number | null>(null);
  const [exercises, setExercises] = useState<SessionExerciseInfo[]>([]);
  const [logBySetId, setLogBySetId] = useState<Map<string, SessionSetLog>>(new Map());

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: session } = await supabase
        .from("client_sessions")
        .select("id, routine_id, duration_seconds")
        .eq("id", sessionId)
        .eq("client_id", clientId)
        .maybeSingle();
      if (!session) {
        if (!cancelled) setLoading(false);
        return;
      }
      const [routineData, { data: logRows }] = await Promise.all([
        fetchRoutineSessionData(supabase, session.routine_id),
        supabase
          .from("client_set_logs")
          .select("routine_exercise_set_id, actual_reps, actual_weight, actual_minutes, actual_level, is_completed")
          .eq("session_id", sessionId),
      ]);
      if (cancelled) return;
      setDurationSeconds(session.duration_seconds);
      setExercises(routineData?.exercises ?? []);
      setLogBySetId(new Map(((logRows ?? []) as SessionSetLog[]).map((l) => [l.routine_exercise_set_id, l])));
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

  const totalSets = exercises.reduce((acc, e) => acc + e.sets.length, 0);
  const completedSets = exercises.reduce(
    (acc, e) => acc + e.sets.filter((s) => logBySetId.get(s.id)?.is_completed).length,
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
            {durationSeconds ? formatDuration(durationSeconds) : "—"}
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
          const cardio = isCardio(exercise.muscle_group);
          return (
            <div key={exercise.id} className="overflow-hidden rounded-xl border">
              <div className="flex items-center gap-2 border-b bg-foreground/[0.02] px-4 py-3">
                <p className="min-w-0 flex-1 truncate text-sm font-medium">{exercise.exercise_name}</p>
                {exercise.video_url ? (
                  <ExerciseVideoButton videoUrl={exercise.video_url} exerciseName={exercise.exercise_name} />
                ) : null}
              </div>
              <div className="px-4 py-3">
                <div className="grid grid-cols-[1.5rem_1fr_1fr_1.5rem] items-center gap-2 pb-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  <span>#</span>
                  <span>{cardio ? "Minutos" : "Peso"}</span>
                  <span>{cardio ? "Nivel" : "Reps"}</span>
                  <span />
                </div>
                <div className="flex flex-col gap-1.5">
                  {exercise.sets.map((set) => {
                    const log = logBySetId.get(set.id);
                    return (
                      <div key={set.id} className="grid grid-cols-[1.5rem_1fr_1fr_1.5rem] items-center gap-2 text-sm">
                        <span className="text-muted-foreground">{set.set_number}</span>
                        <span className="tabular-nums">
                          {cardio
                            ? (log?.actual_minutes ? `${log.actual_minutes} min` : "—")
                            : log?.actual_weight
                              ? `${log.actual_weight} kg`
                              : "—"}
                        </span>
                        <span className="tabular-nums">
                          {cardio ? (log?.actual_level ?? "—") : (log?.actual_reps ?? "—")}
                        </span>
                        {log?.is_completed ? (
                          <Check className="size-4 text-primary" />
                        ) : (
                          <Minus className={cn("size-4 text-muted-foreground/40")} />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
