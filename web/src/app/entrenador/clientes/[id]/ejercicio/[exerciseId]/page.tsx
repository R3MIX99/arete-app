import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { isCardioGroup } from "@/lib/client-exercise-target";
import { ExerciseHistoryPageView, type ExerciseHistorySession } from "@/components/client/exercise-history-page-view";

interface SetLogRow {
  session_date: string;
  set_number: number;
  actual_reps: number | null;
  actual_weight: number | null;
  actual_minutes: number | null;
  actual_level: number | null;
}

/** Misma página de historial de ejercicio (meses + gráfica deslizable
 * peso/reps + acordeón de sesiones) que ya usa el panel de cliente en
 * su pestaña Evolución — aquí el entrenador la ve para un cliente en
 * particular. */
export default async function TrainerExerciseHistoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; exerciseId: string }>;
  searchParams: Promise<{ name?: string; muscle?: string }>;
}) {
  const { id: clientId, exerciseId } = await params;
  const { name, muscle } = await searchParams;
  if (!name) redirect(`/entrenador/clientes/${clientId}`);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const cardio = isCardioGroup(muscle ?? "");

  // Se lee directo de client_set_logs.exercise_id (no de la rutina viva)
  // para que este historial se mantenga intacto aunque el entrenador
  // después edite o borre la rutina que originó estos registros.
  const { data: logRows } = await supabase
    .from("client_set_logs")
    .select("session_date, set_number, actual_reps, actual_weight, actual_minutes, actual_level")
    .eq("client_id", clientId)
    .eq("exercise_id", exerciseId)
    .eq("is_completed", true)
    .order("session_date", { ascending: false });

  const byDate = new Map<string, ExerciseHistorySession["sets"]>();
  for (const row of (logRows ?? []) as SetLogRow[]) {
    const list = byDate.get(row.session_date) ?? [];
    list.push({
      setNumber: row.set_number,
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
