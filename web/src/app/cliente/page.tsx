import { redirect } from "next/navigation";
import Link from "next/link";
import { CalendarDays, Dumbbell, PlayCircle } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { todayKey, sessionsInRange, type CalendarAssignment } from "@/lib/calendar-logic";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

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

export default async function ClientHomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: profile }, { data: assignmentRows }] = await Promise.all([
    supabase.from("profiles").select("full_name").eq("id", user.id).single(),
    supabase
      .from("client_assignments")
      .select(
        "id, client_id, start_date, programs(name, duration_weeks, program_routines(id, week_number, day_of_week, routines(id, name))), routines(id, name), assignment_overrides(program_routine_id, routines(id, name))",
      )
      .eq("client_id", user.id),
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

  const today = todayKey();
  const todaySessions = sessionsInRange(assignments, today, today);

  const { data: inProgressSessions } = await supabase
    .from("client_sessions")
    .select("id, assignment_id, routine_id, session_date")
    .eq("client_id", user.id)
    .eq("status", "in_progress");

  const inProgressByKey = new Map(
    (inProgressSessions ?? []).map((s) => [`${s.assignment_id}:${s.routine_id}:${s.session_date}`, s.id]),
  );

  const firstName = (profile?.full_name || "").trim().split(" ")[0] || "";

  return (
    <div className="mx-auto flex max-w-md flex-col gap-5 p-4">
      <div>
        <p className="text-sm text-muted-foreground">Hola{firstName ? `, ${firstName}` : ""} 👋</p>
        <h1 className="text-xl font-semibold">Tu entrenamiento de hoy</h1>
      </div>

      {todaySessions.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
            <CalendarDays className="size-8 text-muted-foreground" />
            <p className="font-medium">Hoy es día de descanso</p>
            <p className="text-sm text-muted-foreground">
              No tienes ninguna rutina asignada para hoy. Aprovecha para recuperarte.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {todaySessions.map((session) => {
            const key = `${session.assignmentId}:${session.routineId}:${session.date}`;
            const inProgressId = inProgressByKey.get(key);
            const href = `/cliente/entrenamiento/sesion?assignment=${session.assignmentId}&routine=${session.routineId}&date=${session.date}`;
            return (
              <Card key={key} className="overflow-hidden">
                <CardContent className="flex items-center gap-3 p-4">
                  <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Dumbbell className="size-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{session.routineName}</p>
                    {session.isProgram && session.programName ? (
                      <p className="truncate text-xs text-muted-foreground">{session.programName}</p>
                    ) : null}
                  </div>
                  <Button asChild size="sm">
                    <Link href={href}>
                      <PlayCircle className="size-4" />
                      {inProgressId ? "Continuar" : "Empezar"}
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Link
        href="/cliente/entrenamiento"
        className="text-center text-sm font-medium text-primary hover:underline"
      >
        Ver calendario de entrenamiento
      </Link>
    </div>
  );
}
