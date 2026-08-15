"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { ExerciseHistoryPageView, type ExerciseHistorySession } from "@/components/client/exercise-history-page-view";

interface RoutineExerciseRef {
  exercise_id: string;
}

interface SetRef {
  set_number: number;
  routine_exercises: RoutineExerciseRef | RoutineExerciseRef[] | null;
}

interface SetLogRow {
  session_date: string;
  actual_reps: number | null;
  actual_weight: number | null;
  actual_minutes: number | null;
  actual_level: number | null;
  routine_exercise_sets: SetRef | SetRef[] | null;
}

function one<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

/** Contenido del sheet flotante de historial de un ejercicio para un
 * cliente en particular — misma vista (meses, gráfica deslizable
 * peso/reps, acordeón de sesiones) que ya tiene el panel de cliente,
 * cargada en el navegador para mostrarse sin navegar a otra página. */
export function TrainerExerciseHistorySheetContent({
  clientId,
  exerciseId,
  cardio,
}: {
  clientId: string;
  exerciseId: string;
  cardio: boolean;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<ExerciseHistorySession[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: logRows } = await supabase
        .from("client_set_logs")
        .select(
          "session_date, actual_reps, actual_weight, actual_minutes, actual_level, routine_exercise_sets(set_number, routine_exercises(exercise_id))",
        )
        .eq("client_id", clientId)
        .eq("is_completed", true)
        .order("session_date", { ascending: false });
      if (cancelled) return;

      const byDate = new Map<string, ExerciseHistorySession["sets"]>();
      for (const row of (logRows ?? []) as unknown as SetLogRow[]) {
        const setInfo = one(row.routine_exercise_sets);
        const re = one(setInfo?.routine_exercises ?? null);
        if (!re || re.exercise_id !== exerciseId) continue;
        const list = byDate.get(row.session_date) ?? [];
        list.push({
          setNumber: setInfo?.set_number ?? 0,
          actual_reps: row.actual_reps,
          actual_weight: row.actual_weight,
          actual_minutes: row.actual_minutes,
          actual_level: row.actual_level,
        });
        byDate.set(row.session_date, list);
      }
      const grouped: ExerciseHistorySession[] = Array.from(byDate.entries())
        .map(([date, sets]) => ({ date, sets }))
        .sort((a, b) => b.date.localeCompare(a.date));
      setSessions(grouped);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase, clientId, exerciseId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return <ExerciseHistoryPageView exerciseName="" cardio={cardio} sessions={sessions} embedded />;
}
