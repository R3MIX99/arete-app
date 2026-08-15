import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { fetchRoutineSessionData } from "@/lib/server/client-routine-data";
import { WorkoutSessionView } from "@/components/client/workout-session-view";
import type { SessionSetLog } from "@/lib/types/client-panel";

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

  const [routineData, { data: existingSession }] = await Promise.all([
    fetchRoutineSessionData(supabase, routine),
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

  if (!routineData) redirect("/cliente/entrenamiento");

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
      routineName={routineData.routineName}
      exercises={routineData.exercises}
      initialSessionId={sessionId}
      initialSessionStatus={sessionStatus}
      initialLogs={initialLogs}
    />
  );
}
