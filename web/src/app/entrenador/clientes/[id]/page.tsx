import { notFound, redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { ClientProfile } from "@/components/trainer/client-profile";
import type { ClientProfile as ClientProfileType } from "@/lib/types/client";
import type { ExerciseProgressSummary, ProgressMeasurement } from "@/lib/types/progress";

interface SetLogRow {
  session_date: string;
  actual_weight: number;
  routine_exercise_sets:
    | {
        routine_exercises:
          | {
              exercise_id: string;
              exercises: { name: string } | { name: string }[] | null;
            }
          | {
              exercise_id: string;
              exercises: { name: string } | { name: string }[] | null;
            }[]
          | null;
      }
    | {
        routine_exercises:
          | {
              exercise_id: string;
              exercises: { name: string } | { name: string }[] | null;
            }
          | {
              exercise_id: string;
              exercises: { name: string } | { name: string }[] | null;
            }[]
          | null;
      }[]
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

  const [{ data: client }, { data: measurements }, { data: setLogs }] = await Promise.all([
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
        "session_date, actual_weight, routine_exercise_sets(routine_exercises(exercise_id, exercises(name)))",
      )
      .eq("client_id", id)
      .not("actual_weight", "is", null)
      .order("session_date"),
  ]);

  if (!client) notFound();

  const byExercise = new Map<string, { name: string; logs: { date: string; weight: number }[] }>();
  for (const row of (setLogs ?? []) as SetLogRow[]) {
    const res = one(row.routine_exercise_sets);
    const re = one(res?.routine_exercises ?? null);
    if (!re) continue;
    const exerciseName = one(re.exercises)?.name ?? "Ejercicio";
    const entry = byExercise.get(re.exercise_id) ?? { name: exerciseName, logs: [] };
    entry.logs.push({ date: row.session_date, weight: row.actual_weight });
    byExercise.set(re.exercise_id, entry);
  }

  const exerciseSummaries: ExerciseProgressSummary[] = Array.from(byExercise.entries())
    .map(([exerciseId, { name, logs }]) => {
      const sorted = [...logs].sort((a, b) => a.date.localeCompare(b.date));
      return {
        exercise_id: exerciseId,
        exercise_name: name,
        starting_weight: sorted[0].weight,
        current_weight: sorted[sorted.length - 1].weight,
        logs: sorted,
      };
    })
    .sort((a, b) => a.exercise_name.localeCompare(b.exercise_name));

  return (
    <ClientProfile
      trainerId={user.id}
      client={client as ClientProfileType}
      measurements={(measurements ?? []) as ProgressMeasurement[]}
      exerciseSummaries={exerciseSummaries}
    />
  );
}
