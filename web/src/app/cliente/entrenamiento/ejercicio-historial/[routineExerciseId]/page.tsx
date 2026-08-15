import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { summarizeTarget, isCardioGroup } from "@/lib/client-exercise-target";
import { ExerciseHistoryPageView, type ExerciseHistorySession } from "@/components/client/exercise-history-page-view";
import type { SessionExerciseInfo } from "@/lib/types/client-panel";

interface RoutineExerciseSetRow {
  id: string;
  set_number: number;
  target_reps_min: number | null;
  target_reps_max: number | null;
  suggested_weight: number | null;
  rest_seconds: number | null;
  target_minutes: number | null;
  target_level: number | null;
}

function one<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export default async function ExerciseHistoryPage({
  params,
}: {
  params: Promise<{ routineExerciseId: string }>;
}) {
  const { routineExerciseId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: reRow } = await supabase
    .from("routine_exercises")
    .select(
      "id, notes, exercises(name, muscle_group, equipment, video_url, description), routine_exercise_sets(id, set_number, target_reps_min, target_reps_max, suggested_weight, rest_seconds, target_minutes, target_level)",
    )
    .eq("id", routineExerciseId)
    .maybeSingle();

  if (!reRow) redirect("/cliente/entrenamiento");

  const ex = one(
    reRow.exercises as
      | { name: string; muscle_group: string; equipment: string; video_url: string | null; description: string | null }
      | { name: string; muscle_group: string; equipment: string; video_url: string | null; description: string | null }[]
      | null,
  );
  const sets = ((reRow.routine_exercise_sets ?? []) as RoutineExerciseSetRow[])
    .slice()
    .sort((a, b) => a.set_number - b.set_number);
  const setIds = sets.map((s) => s.id);
  const setNumberById = new Map(sets.map((s) => [s.id, s.set_number]));

  const exercise: SessionExerciseInfo = {
    id: reRow.id,
    exercise_id: "",
    exercise_name: ex?.name ?? "Ejercicio",
    exercise_description: ex?.description ?? null,
    muscle_group: ex?.muscle_group ?? "",
    equipment: ex?.equipment ?? "",
    video_url: ex?.video_url ?? null,
    notes: reRow.notes,
    order_index: 0,
    sets: sets.map((s) => ({
      id: s.id,
      set_number: s.set_number,
      target_reps_min: s.target_reps_min,
      target_reps_max: s.target_reps_max,
      suggested_weight: s.suggested_weight,
      rest_seconds: s.rest_seconds,
      target_minutes: s.target_minutes,
      target_level: s.target_level,
    })),
  };

  const cardio = isCardioGroup(exercise.muscle_group);

  const { data: logRows } =
    setIds.length > 0
      ? await supabase
          .from("client_set_logs")
          .select("session_date, actual_reps, actual_weight, actual_minutes, actual_level, routine_exercise_set_id")
          .eq("client_id", user.id)
          .in("routine_exercise_set_id", setIds)
          .eq("is_completed", true)
          .order("session_date", { ascending: false })
      : { data: [] };

  const byDate = new Map<
    string,
    { session_date: string; actual_reps: number | null; actual_weight: number | null; actual_minutes: number | null; actual_level: number | null; routine_exercise_set_id: string }[]
  >();
  for (const row of logRows ?? []) {
    const list = byDate.get(row.session_date) ?? [];
    list.push(row);
    byDate.set(row.session_date, list);
  }

  const sessions: ExerciseHistorySession[] = Array.from(byDate.entries())
    .map(([date, rows]) => ({
      date,
      sets: rows.map((r) => ({
        setNumber: setNumberById.get(r.routine_exercise_set_id) ?? 0,
        actual_reps: r.actual_reps,
        actual_weight: r.actual_weight,
        actual_minutes: r.actual_minutes,
        actual_level: r.actual_level,
      })),
    }))
    .sort((a, b) => b.date.localeCompare(a.date));

  return (
    <ExerciseHistoryPageView
      exerciseName={exercise.exercise_name}
      targetSummary={summarizeTarget(exercise)}
      cardio={cardio}
      sessions={sessions}
    />
  );
}
