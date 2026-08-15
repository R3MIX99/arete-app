import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { ClientTrainingTabs } from "@/components/client/client-training-tabs";
import type { CompletedSessionRow, ClientExerciseProgress } from "@/lib/types/client-panel";
import type { ProgressMeasurement, ProgressPhotoEntry } from "@/lib/types/progress";

interface SessionRow {
  id: string;
  session_date: string;
  finished_at: string | null;
  duration_seconds: number | null;
  routines: { name: string } | { name: string }[] | null;
}

interface ExerciseRef {
  name: string;
  muscle_group: string;
}

interface SetLogRow {
  session_date: string;
  actual_weight: number | null;
  exercise_id: string;
  exercises: ExerciseRef | ExerciseRef[] | null;
}

function one<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export default async function ClientTrainingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: sessionRows }, { data: measurements }, { data: photoEntries }, { data: setLogRows }] =
    await Promise.all([
      supabase
        .from("client_sessions")
        .select("id, session_date, finished_at, duration_seconds, routines(name)")
        .eq("client_id", user.id)
        .eq("status", "completed")
        .order("session_date", { ascending: false })
        .order("finished_at", { ascending: false })
        .limit(40),
      supabase
        .from("progress_measurements")
        .select("id, entry_date, metric_key, value, notes")
        .eq("client_id", user.id)
        .order("entry_date"),
      supabase
        .from("progress_entries")
        .select("id, entry_date, photo_path, notes")
        .eq("client_id", user.id)
        .not("photo_path", "is", null)
        .order("entry_date"),
      supabase
        .from("client_set_logs")
        .select("session_date, actual_weight, exercise_id, exercises(name, muscle_group)")
        .eq("client_id", user.id)
        .eq("is_completed", true)
        .not("actual_weight", "is", null)
        .order("session_date"),
    ]);

  const completedSessions: CompletedSessionRow[] = ((sessionRows ?? []) as SessionRow[]).map((row) => ({
    id: row.id,
    sessionDate: row.session_date,
    routineName: one(row.routines)?.name ?? "Rutina",
    durationSeconds: row.duration_seconds,
  }));

  const byExercise = new Map<string, ClientExerciseProgress>();
  for (const row of (setLogRows ?? []) as unknown as SetLogRow[]) {
    const exercise = one(row.exercises);
    if (!exercise || exercise.muscle_group === "cardio" || row.actual_weight === null) continue;

    const existing = byExercise.get(row.exercise_id) ?? {
      exerciseId: row.exercise_id,
      exerciseName: exercise.name,
      muscleGroup: exercise.muscle_group,
      logs: [],
    };
    const existingForDate = existing.logs.find((l) => l.date === row.session_date);
    if (existingForDate) {
      existingForDate.weight = Math.max(existingForDate.weight, row.actual_weight);
    } else {
      existing.logs.push({ date: row.session_date, weight: row.actual_weight });
    }
    byExercise.set(row.exercise_id, existing);
  }
  const exerciseProgress = Array.from(byExercise.values())
    .map((e) => ({ ...e, logs: e.logs.sort((a, b) => a.date.localeCompare(b.date)) }))
    .sort((a, b) => a.exerciseName.localeCompare(b.exerciseName));

  return (
    <ClientTrainingTabs
      completedSessions={completedSessions}
      measurements={(measurements ?? []) as ProgressMeasurement[]}
      photos={(photoEntries ?? []) as ProgressPhotoEntry[]}
      exerciseProgress={exerciseProgress}
    />
  );
}
