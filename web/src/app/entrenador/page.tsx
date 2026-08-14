import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { todayKey, sessionsInRange, type CalendarAssignment } from "@/lib/calendar-logic";
import { DashboardView } from "@/components/trainer/dashboard-view";

interface ProgramRoutineRow {
  id: string;
  week_number: number;
  day_of_week: number;
  routines: { name: string } | { name: string }[] | null;
}

interface OverrideRow {
  program_routine_id: string;
  routines: { name: string } | { name: string }[] | null;
}

interface AssignmentRow {
  id: string;
  client_id: string;
  start_date: string;
  profiles: { full_name: string; email: string } | { full_name: string; email: string }[] | null;
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
  routines: { name: string } | { name: string }[] | null;
  assignment_overrides: OverrideRow[] | null;
}

interface ClientRow {
  id: string;
  full_name: string;
  email: string;
  status: string;
}

interface MeasurementRow {
  client_id: string;
  entry_date: string;
  value: number;
}

function one<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [
    { data: clients },
    { count: routineCount },
    { data: assignmentRows },
    { data: weightRows },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, email, status")
      .eq("role", "client")
      .order("full_name"),
    supabase.from("routines").select("id", { count: "exact", head: true }),
    supabase
      .from("client_assignments")
      .select(
        "id, client_id, start_date, profiles!client_assignments_client_id_fkey(full_name, email), programs(name, duration_weeks, program_routines(id, week_number, day_of_week, routines(name))), routines(name), assignment_overrides(program_routine_id, routines(name))",
      ),
    supabase
      .from("progress_measurements")
      .select("client_id, entry_date, value")
      .eq("metric_key", "weight_kg")
      .order("entry_date"),
  ]);

  const allClients = (clients ?? []) as ClientRow[];
  const activeClients = allClients.filter((c) => c.status === "active");
  const inactiveClients = allClients.filter((c) => c.status === "inactive");

  const assignments: CalendarAssignment[] = ((assignmentRows ?? []) as AssignmentRow[]).map(
    (row) => {
      const client = one(row.profiles);
      const clientName = (client?.full_name ?? "").trim() || client?.email || "Cliente";
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
        routineName: one(r.routines)?.name ?? "",
      }));

      return {
        assignmentId: row.id,
        clientId: row.client_id,
        clientName,
        startDate: row.start_date,
        isProgram: program !== null,
        programName: program?.name ?? null,
        programDurationWeeks: program?.duration_weeks ?? null,
        standaloneRoutineName: routine?.name ?? null,
        slots,
        overridesByProgramRoutineId: overrides,
      };
    },
  );

  const today = todayKey();
  const todaySessions = sessionsInRange(assignments, today, today);

  return (
    <DashboardView
      activeClientsCount={activeClients.length}
      inactiveClients={inactiveClients.map((c) => ({
        id: c.id,
        full_name: c.full_name,
        email: c.email,
      }))}
      routineCount={routineCount ?? 0}
      todaySessions={todaySessions}
      clientOptions={allClients.map((c) => ({ id: c.id, full_name: c.full_name }))}
      weightMeasurements={(weightRows ?? []) as MeasurementRow[]}
    />
  );
}
