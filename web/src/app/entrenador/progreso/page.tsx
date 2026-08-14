import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { ProgressTrackingView } from "@/components/trainer/progress-tracking-view";
import type { CalendarAssignment } from "@/lib/calendar-logic";
import type { ProgressMeasurement, ProgressPhotoEntry } from "@/lib/types/progress";

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
    | {
        name: string;
        duration_weeks: number;
        program_routines: ProgramRoutineRow[] | null;
      }
    | {
        name: string;
        duration_weeks: number;
        program_routines: ProgramRoutineRow[] | null;
      }[]
    | null;
  routines: { id: string; name: string } | { id: string; name: string }[] | null;
  assignment_overrides: OverrideRow[] | null;
}

interface ClientRow {
  id: string;
  full_name: string;
  status: string;
}

function one<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export default async function ProgressPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [
    { data: clients },
    { data: assignmentRows },
    { data: measurements },
    { data: photoEntries },
    { data: setLogs },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, status")
      .eq("role", "client")
      .order("full_name"),
    supabase
      .from("client_assignments")
      .select(
        "id, client_id, start_date, programs(name, duration_weeks, program_routines(id, week_number, day_of_week, routines(id, name))), routines(id, name), assignment_overrides(program_routine_id, routines(id, name))",
      ),
    supabase
      .from("progress_measurements")
      .select("id, client_id, entry_date, metric_key, value, notes")
      .order("entry_date"),
    supabase
      .from("progress_entries")
      .select("id, client_id, entry_date, photo_path, notes")
      .not("photo_path", "is", null)
      .order("entry_date"),
    supabase.from("client_set_logs").select("client_id, session_date"),
  ]);

  const assignments: CalendarAssignment[] = ((assignmentRows ?? []) as AssignmentRow[]).map((row) => {
    const program = one(row.programs);
    const routine = one(row.routines);
    const overrides: Record<string, string> = {};
    for (const o of row.assignment_overrides ?? []) {
      overrides[o.program_routine_id] = one(o.routines)?.name ?? "";
    }
    const slots = (program?.program_routines ?? []).map((r) => ({
      programRoutineId: r.id,
      weekNumber: r.week_number,
      dayOfWeek: r.day_of_week,
      routineId: one(r.routines)?.id ?? "",
      routineName: one(r.routines)?.name ?? "",
    }));

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
    };
  });

  const loggedDatesByClient = new Map<string, Set<string>>();
  for (const row of (setLogs ?? []) as { client_id: string; session_date: string }[]) {
    const set = loggedDatesByClient.get(row.client_id) ?? new Set<string>();
    set.add(row.session_date);
    loggedDatesByClient.set(row.client_id, set);
  }

  return (
    <ProgressTrackingView
      trainerId={user.id}
      clients={((clients ?? []) as ClientRow[]).filter((c) => c.status === "active")}
      assignments={assignments}
      measurements={(measurements ?? []) as (ProgressMeasurement & { client_id: string })[]}
      photos={(photoEntries ?? []) as (ProgressPhotoEntry & { client_id: string })[]}
      loggedDatesByClient={Object.fromEntries(
        Array.from(loggedDatesByClient.entries()).map(([k, v]) => [k, Array.from(v)]),
      )}
    />
  );
}
