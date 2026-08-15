"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import type { SessionExerciseInfo } from "@/lib/types/client-panel";

interface HistoryRow {
  session_date: string;
  set_number: number;
  actual_reps: number | null;
  actual_weight: number | null;
  actual_minutes: number | null;
  actual_level: number | null;
}

/** Series completadas de un ejercicio a lo largo del tiempo, agrupadas
 * por fecha — usado tanto en la sesión activa como en la vista previa
 * de una rutina. */
export function ExerciseHistoryList({ exercise, cardio }: { exercise: SessionExerciseInfo; cardio: boolean }) {
  const supabase = useMemo(() => createClient(), []);
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<HistoryRow[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const setIds = exercise.sets.map((s) => s.id);
      const { data } = await supabase
        .from("client_set_logs")
        .select("session_date, actual_reps, actual_weight, actual_minutes, actual_level, routine_exercise_set_id")
        .in("routine_exercise_set_id", setIds)
        .eq("is_completed", true)
        .order("session_date", { ascending: false })
        .limit(60);
      if (cancelled) return;
      const setNumberById = new Map(exercise.sets.map((s) => [s.id, s.set_number]));
      const mapped: HistoryRow[] = (data ?? []).map(
        (row: {
          session_date: string;
          actual_reps: number | null;
          actual_weight: number | null;
          actual_minutes: number | null;
          actual_level: number | null;
          routine_exercise_set_id: string;
        }) => ({
          session_date: row.session_date,
          set_number: setNumberById.get(row.routine_exercise_set_id) ?? 0,
          actual_reps: row.actual_reps,
          actual_weight: row.actual_weight,
          actual_minutes: row.actual_minutes,
          actual_level: row.actual_level,
        }),
      );
      setRows(mapped);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [exercise, supabase]);

  const byDate = useMemo(() => {
    const map = new Map<string, HistoryRow[]>();
    for (const row of rows) {
      const list = map.get(row.session_date) ?? [];
      list.push(row);
      map.set(row.session_date, list);
    }
    return Array.from(map.entries());
  }, [rows]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (byDate.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        Todavía no tienes series completadas de este ejercicio.
      </p>
    );
  }

  return (
    <div className="flex max-h-96 flex-col gap-3 overflow-y-auto">
      {byDate.map(([date, dayRows]) => (
        <div key={date} className="rounded-lg border px-3 py-2">
          <p className="mb-1.5 text-xs font-medium text-muted-foreground">
            {new Date(date + "T00:00:00").toLocaleDateString("es-MX", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {dayRows
              .sort((a, b) => a.set_number - b.set_number)
              .map((row, i) => (
                <span key={i} className="rounded-md bg-muted px-2 py-1 text-xs tabular-nums text-foreground">
                  {cardio
                    ? `${row.actual_minutes ?? "-"} min · nivel ${row.actual_level ?? "-"}`
                    : `${row.actual_weight ?? "-"} kg × ${row.actual_reps ?? "-"}`}
                </span>
              ))}
          </div>
        </div>
      ))}
    </div>
  );
}
