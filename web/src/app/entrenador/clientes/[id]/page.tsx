import { notFound, redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { ClientProfile } from "@/components/trainer/client-profile";
import type { ClientProfile as ClientProfileType } from "@/lib/types/client";
import type { ExerciseProgressSummary, ProgressMeasurement } from "@/lib/types/progress";
import type { CompletedSessionRow } from "@/lib/types/client-panel";

interface ExerciseRef {
  name: string;
  muscle_group: string;
}

interface RoutineExerciseRef {
  exercise_id: string;
  exercises: ExerciseRef | ExerciseRef[] | null;
}

interface SetLogRow {
  session_date: string;
  actual_weight: number;
  routine_exercise_sets:
    | { routine_exercises: RoutineExerciseRef | RoutineExerciseRef[] | null }
    | { routine_exercises: RoutineExerciseRef | RoutineExerciseRef[] | null }[]
    | null;
}

function one<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: client }, { data: measurements }, { data: setLogs }, { data: sessionRows }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("id, full_name, email, phone, goal, health_notes, status, created_at")
        .eq("id", id)
        .eq("role", "client")
        .single(),
      supabase
        .from("progress_measurements")
        .select("id, entry_date, metric_key, value, notes")
        .eq("client_id", id)
        .order("entry_date"),
      supabase
        .from("client_set_logs")
        .select(
          "session_date, actual_weight, routine_exercise_sets(routine_exercises(exercise_id, exercises(name, muscle_group)))",
        )
        .eq("client_id", id)
        .eq("is_completed", true)
        .not("actual_weight", "is", null)
        .order("session_date"),
      supabase
        .from("client_sessions")
        .select("id, session_date, duration_seconds, routines(name)")
        .eq("client_id", id)
        .eq("status", "completed")
        .order("session_date", { ascending: false })
        .order("finished_at", { ascending: false })
        .limit(60),
    ]);

  if (!client) notFound();

  const byExercise = new Map<
    string,
    { name: string; muscleGroup: string; logs: { date: string; weight: number }[] }
  >();
  for (const row of (setLogs ?? []) as SetLogRow[]) {
    const res = one(row.routine_exercise_sets);
    const re = one(res?.routine_exercises ?? null);
    if (!re) continue;
    const exercise = one(re.exercises);
    const entry = byExercise.get(re.exercise_id) ?? {
      name: exercise?.name ?? "Ejercicio",
      muscleGroup: exercise?.muscle_group ?? "",
      logs: [],
    };
    // Varias series del mismo día cuentan como un solo registro (el
    // más pesado) — si no, un ejercicio con 3 series en una sesión
    // aparecía como 3 puntos separados en la misma fecha en la gráfica.
    const existingForDate = entry.logs.find((l) => l.date === row.session_date);
    if (existingForDate) {
      existingForDate.weight = Math.max(existingForDate.weight, row.actual_weight);
    } else {
      entry.logs.push({ date: row.session_date, weight: row.actual_weight });
    }
    byExercise.set(re.exercise_id, entry);
  }

  const exerciseSummaries: ExerciseProgressSummary[] = Array.from(byExercise.entries())
    .map(([exerciseId, { name, muscleGroup, logs }]) => {
      const sorted = [...logs].sort((a, b) => a.date.localeCompare(b.date));
      return {
        exercise_id: exerciseId,
        exercise_name: name,
        muscle_group: muscleGroup,
        starting_weight: sorted[0].weight,
        current_weight: sorted[sorted.length - 1].weight,
        logs: sorted,
      };
    })
    .sort((a, b) => a.exercise_name.localeCompare(b.exercise_name));

  interface SessionRow {
    id: string;
    session_date: string;
    duration_seconds: number | null;
    routines: { name: string } | { name: string }[] | null;
  }
  const completedSessions: CompletedSessionRow[] = ((sessionRows ?? []) as SessionRow[]).map((row) => ({
    id: row.id,
    sessionDate: row.session_date,
    routineName: one(row.routines)?.name ?? "Rutina",
    durationSeconds: row.duration_seconds,
  }));

  return (
    <ClientProfile
      trainerId={user.id}
      client={client as ClientProfileType}
      measurements={(measurements ?? []) as ProgressMeasurement[]}
      exerciseSummaries={exerciseSummaries}
      completedSessions={completedSessions}
    />
  );
}
