import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { WorkoutSessionView } from "@/components/client/workout-session-view";
import type { SessionExerciseInfo, SessionSetLog } from "@/lib/types/client-panel";

interface RoutineExerciseRow {
  id: string;
  exercise_id: string;
  order_index: number;
  notes: string | null;
  exercises: { name: string; muscle_group: string; equipment: string; video_url: string | null } | { name: string; muscle_group: string; equipment: string; video_url: string | null }[] | null;
  routine_exercise_sets: {
    id: string;
    set_number: number;
    target_reps_min: number | null;
    target_reps_max: number | null;
    suggested_weight: number | null;
    rest_seconds: number | null;
    target_minutes: number | null;
    target_level: number | null;
  }[];
}

function one<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export default async function WorkoutSessionPage({
  searchParams,
}: {
  searchParams: Promise<{ assignment?: string; routine?: string; date?: string }>;
}) {
  const { assignment, routine, date } = await searchParams;
  if (!assignment || !routine || !date) redirect("/cliente/entrenamiento");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: routineRow }, { data: exerciseRows }, { data: existingSession }] = await Promise.all([
    supabase.from("routines").select("id, name, level, goal").eq("id", routine).single(),
    supabase
      .from("routine_exercises")
      .select(
        "id, exercise_id, order_index, notes, exercises(name, muscle_group, equipment, video_url), routine_exercise_sets(id, set_number, target_reps_min, target_reps_max, suggested_weight, rest_seconds, target_minutes, target_level)",
      )
      .eq("routine_id", routine)
      .order("order_index"),
    supabase
      .from("client_sessions")
      .select("id, started_at, status")
      .eq("client_id", user.id)
      .eq("assignment_id", assignment)
      .eq("routine_id", routine)
      .eq("session_date", date)
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (!routineRow) redirect("/cliente/entrenamiento");

  const exercises: SessionExerciseInfo[] = ((exerciseRows ?? []) as RoutineExerciseRow[]).map((row) => {
    const ex = one(row.exercises);
    return {
      id: row.id,
      exercise_id: row.exercise_id,
      exercise_name: ex?.name ?? "Ejercicio",
      muscle_group: ex?.muscle_group ?? "",
      equipment: ex?.equipment ?? "",
      video_url: ex?.video_url ?? null,
      notes: row.notes,
      order_index: row.order_index,
      sets: (row.routine_exercise_sets ?? [])
        .slice()
        .sort((a, b) => a.set_number - b.set_number)
        .map((s) => ({
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
  });

  let initialLogs: SessionSetLog[] = [];
  const sessionId: string | null = existingSession?.id ?? null;
  const sessionStatus: string | null = existingSession?.status ?? null;

  if (sessionId) {
    const { data: logRows } = await supabase
      .from("client_set_logs")
      .select("routine_exercise_set_id, actual_reps, actual_weight, actual_minutes, actual_level, is_completed")
      .eq("session_id", sessionId);
    initialLogs = (logRows ?? []) as SessionSetLog[];
  }

  return (
    <WorkoutSessionView
      clientId={user.id}
      assignmentId={assignment}
      routineId={routine}
      sessionDate={date}
      routineName={routineRow.name}
      exercises={exercises}
      initialSessionId={sessionId}
      initialSessionStatus={sessionStatus}
      initialLogs={initialLogs}
    />
  );
}
