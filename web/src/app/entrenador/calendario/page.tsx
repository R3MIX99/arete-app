import { createClient } from "@/lib/supabase/server";
import { CalendarView } from "@/components/trainer/calendar-view";
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
  routines: { id: string; name: string } | { id: string; name: string }[] | null;
  assignment_overrides: OverrideRow[] | null;
}

function one<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export default async function CalendarPage() {
  const supabase = await createClient();

  const { data } = await supabase
    .from("client_assignments")
    .select(
      "id, client_id, start_date, profiles!client_assignments_client_id_fkey(full_name, email), programs(name, duration_weeks, program_routines(id, week_number, day_of_week, routines(id, name))), routines(id, name), assignment_overrides(program_routine_id, routines(id, name))",
    );

  const assignments: CalendarAssignment[] = ((data ?? []) as AssignmentRow[]).map((row) => {
    const client = one(row.profiles);
    const clientName = (client?.full_name ?? "").trim() || client?.email || "Cliente";
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
      clientName,
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

  return <CalendarView assignments={assignments} />;
}
