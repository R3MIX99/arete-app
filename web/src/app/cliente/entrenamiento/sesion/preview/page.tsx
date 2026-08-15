import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { fetchRoutineSessionData } from "@/lib/server/client-routine-data";
import { RoutinePreviewView } from "@/components/client/routine-preview-view";

export default async function RoutinePreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ assignment?: string; routine?: string; date?: string }>;
}) {
  const { assignment, routine, date } = await searchParams;
  if (!assignment || !routine || !date) redirect("/cliente/agenda");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const activeHref = `/cliente/entrenamiento/sesion?assignment=${assignment}&routine=${routine}&date=${date}`;

  // Si ya existe una sesión para este día (en curso o ya completada),
  // no tiene caso mostrar la vista previa — se manda directo a donde
  // corresponda seguir.
  const { data: existingSession } = await supabase
    .from("client_sessions")
    .select("id, status")
    .eq("client_id", user.id)
    .eq("assignment_id", assignment)
    .eq("routine_id", routine)
    .eq("session_date", date)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingSession?.status === "completed") {
    redirect(`/cliente/entrenamiento/sesion/${existingSession.id}`);
  }
  if (existingSession?.status === "in_progress") {
    redirect(activeHref);
  }

  const routineData = await fetchRoutineSessionData(supabase, routine);
  if (!routineData) redirect("/cliente/agenda");

  return (
    <RoutinePreviewView
      routineName={routineData.routineName}
      routineDescription={routineData.routineDescription}
      exercises={routineData.exercises}
      startHref={activeHref}
    />
  );
}
