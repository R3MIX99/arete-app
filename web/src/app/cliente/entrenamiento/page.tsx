import { redirect } from "next/navigation";
import Link from "next/link";
import { Dumbbell } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import {
  addDays,
  todayKey,
  sessionsInRange,
  groupSessionsByDate,
  type CalendarAssignment,
} from "@/lib/calendar-logic";
import { Card, CardContent } from "@/components/ui/card";

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

const WEEKDAY_LABELS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

function formatDayLabel(dateKey: string, todayStr: string, tomorrowStr: string): string {
  if (dateKey === todayStr) return "Hoy";
  if (dateKey === tomorrowStr) return "Mañana";
  const [, m, d] = dateKey.split("-").map(Number);
  const weekday = WEEKDAY_LABELS[(new Date(dateKey + "T00:00:00Z").getUTCDay() + 6) % 7];
  return `${weekday} ${d}/${m}`;
}

export default async function ClientTrainingCalendarPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: assignmentRows } = await supabase
    .from("client_assignments")
    .select(
      "id, client_id, start_date, programs(name, duration_weeks, program_routines(id, week_number, day_of_week, routines(id, name))), routines(id, name), assignment_overrides(program_routine_id, routines(id, name))",
    )
    .eq("client_id", user.id);

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

  const today = todayKey();
  const tomorrow = addDays(today, 1);
  const rangeEnd = addDays(today, 13);
  const sessions = sessionsInRange(assignments, today, rangeEnd);
  const byDate = groupSessionsByDate(sessions);

  const dateKeys: string[] = [];
  for (let i = 0; i <= 13; i++) dateKeys.push(addDays(today, i));

  return (
    <div className="mx-auto flex max-w-md flex-col gap-4 p-4">
      <h1 className="text-xl font-semibold">Entrenamiento</h1>
      <div className="flex flex-col gap-4">
        {dateKeys.map((dateKey) => {
          const daySessions = byDate.get(dateKey) ?? [];
          if (daySessions.length === 0) return null;
          return (
            <div key={dateKey} className="flex flex-col gap-2">
              <p className="px-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {formatDayLabel(dateKey, today, tomorrow)}
              </p>
              {daySessions.map((session) => (
                <Link
                  key={`${session.assignmentId}-${session.routineId}-${session.date}`}
                  href={`/cliente/entrenamiento/sesion?assignment=${session.assignmentId}&routine=${session.routineId}&date=${session.date}`}
                >
                  <Card className="transition-colors hover:bg-accent/40">
                    <CardContent className="flex items-center gap-3 p-4">
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <Dumbbell className="size-4.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{session.routineName}</p>
                        {session.isProgram && session.programName ? (
                          <p className="truncate text-xs text-muted-foreground">{session.programName}</p>
                        ) : null}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          );
        })}
        {sessions.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              No tienes sesiones programadas en los próximos días.
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
