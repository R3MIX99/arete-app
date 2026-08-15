import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { isCardioGroup } from "@/lib/client-exercise-target";
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

export default async function ExerciseEvolutionHistoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ exerciseId: string }>;
  searchParams: Promise<{ name?: string; muscle?: string }>;
}) {
  const { exerciseId } = await params;
  const { name, muscle } = await searchParams;
  if (!name) redirect("/cliente/entrenamiento");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // El nombre y grupo muscular llegan por query (ya los tenía la lista
  // de Evolución) para no depender de una consulta directa a
  // `exercises`, cuya RLS de cliente solo cubre ejercicios de una
  // rutina asignada *actualmente* — este historial debe verse aunque
  // el ejercicio ya no esté en la rutina vigente.
  const cardio = isCardioGroup(muscle ?? "");

  const { data: logRows } = await supabase
    .from("client_set_logs")
    .select(
      "session_date, actual_reps, actual_weight, actual_minutes, actual_level, routine_exercise_sets(set_number, routine_exercises(exercise_id))",
    )
    .eq("client_id", user.id)
    .eq("is_completed", true)
    .order("session_date", { ascending: false });

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

  const sessions: ExerciseHistorySession[] = Array.from(byDate.entries())
    .map(([date, sets]) => ({ date, sets }))
    .sort((a, b) => b.date.localeCompare(a.date));

  return <ExerciseHistoryPageView exerciseName={name} cardio={cardio} sessions={sessions} />;
}
