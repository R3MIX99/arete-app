import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { fetchRoutineCardMeta } from "@/lib/server/routine-card-meta";
import { ClientAgenda } from "@/components/client/client-agenda";
import { ClientDeactivatedNotice } from "@/components/client/client-deactivated-notice";
import type { CalendarAssignment } from "@/lib/calendar-logic";

interface ProgramRoutineRow {
  id: string;
  week_number: number;
  day_of_week: number;
  routines: { id: string; name: string } | { id: string; name: string }[] | null;
}

interface OverrideRow {
  program_routine_id: string;
  routines: { id: string; name: string } | { id: string; name: string }[] | null;
}

interface AssignmentRow {
  id: string;
  client_id: string;
  start_date: string;
  programs:
    | { name: string; duration_weeks: number; program_routines: ProgramRoutineRow[] | null }
    | { name: string; duration_weeks: number; program_routines: ProgramRoutineRow[] | null }[]
    | null;
  routines: { id: string; name: string } | { id: string; name: string }[] | null;
  assignment_overrides: OverrideRow[] | null;
}

function one<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export default async function ClientAgendaPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: ownProfile } = await supabase
    .from("profiles")
    .select("status")
    .eq("id", user.id)
    .single();
  if (ownProfile?.status === "inactive") {
    return (
      <div className="mx-auto flex max-w-md flex-col gap-4 p-4 pb-24">
        <h1 className="text-xl font-semibold">Agenda</h1>
        <ClientDeactivatedNotice description="Por ahora no puedes ver tu agenda. Contacta a tu entrenador si crees que es un error." />
      </div>
    );
  }

  const [
    { data: assignmentRows },
    { data: inProgressSessions },
    { data: completedSessions },
    routineMeta,
  ] = await Promise.all([
      supabase
        .from("client_assignments")
        .select(
          "id, client_id, start_date, programs(name, duration_weeks, program_routines(id, week_number, day_of_week, routines(id, name))), routines(id, name), assignment_overrides(program_routine_id, routines(id, name))",
        )
        .eq("client_id", user.id),
      supabase
        .from("client_sessions")
        .select("id, assignment_id, routine_id, session_date")
        .eq("client_id", user.id)
        .eq("status", "in_progress"),
      supabase
        .from("client_sessions")
        .select("id, assignment_id, routine_id, session_date")
        .eq("client_id", user.id)
        .eq("status", "completed"),
      fetchRoutineCardMeta(supabase),
    ]);

  const assignments: CalendarAssignment[] = ((assignmentRows ?? []) as AssignmentRow[]).map((row) => {
    const program = one(row.programs);
    const routine = one(row.routines);
    const overrides: Record<string, string> = {};
    const overrideIds: Record<string, string> = {};
    for (const o of row.assignment_overrides ?? []) {
      const overrideRoutine = one(o.routines);
      overrides[o.program_routine_id] = overrideRoutine?.name ?? "";
      if (overrideRoutine?.id) overrideIds[o.program_routine_id] = overrideRoutine.id;
    }
    const slots = (program?.program_routines ?? []).map((r) => {
      const slotRoutine = one(r.routines);
      return {
        programRoutineId: r.id,
        weekNumber: r.week_number,
        dayOfWeek: r.day_of_week,
        routineId: slotRoutine?.id ?? "",
        routineName: slotRoutine?.name ?? "",
      };
    });
    return {
      assignmentId: row.id,
      clientId: row.client_id,
      clientName: "",
      startDate: row.start_date,
      isProgram: program !== null,
      programName: program?.name ?? null,
      programDurationWeeks: program?.duration_weeks ?? null,
      standaloneRoutineId: routine?.id ?? null,
      standaloneRoutineName: routine?.name ?? null,
      slots,
      overridesByProgramRoutineId: overrides,
      overrideRoutineIdByProgramRoutineId: overrideIds,
    };
  });

  const inProgressByKey: Record<string, string> = {};
  for (const s of inProgressSessions ?? []) {
    inProgressByKey[`${s.assignment_id}:${s.routine_id}:${s.session_date}`] = s.id;
  }

  const completedByKey: Record<string, string> = {};
  for (const s of completedSessions ?? []) {
    completedByKey[`${s.assignment_id}:${s.routine_id}:${s.session_date}`] = s.id;
  }

  return (
    <div className="mx-auto flex max-w-md flex-col gap-4 p-4 pb-24">
      <h1 className="text-xl font-semibold">Agenda</h1>
      <ClientAgenda
        assignments={assignments}
        inProgressByKey={inProgressByKey}
        completedByKey={completedByKey}
        routineMeta={routineMeta}
      />
    </div>
  );
}
