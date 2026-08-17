"use client";

import { useMemo } from "react";
import Link from "next/link";
import { CalendarDays, Check, ChevronRight, Dumbbell } from "lucide-react";

import {
  addDays,
  compareKeys,
  sessionsInRange,
  todayKey,
  type CalendarAssignment,
} from "@/lib/calendar-logic";
import { formatDate } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";
import {
  ClientMonthActivity,
  type CompletedSessionDay,
} from "@/components/client/client-month-activity";
import {
  ClientRecords,
  ClientWeightTrend,
  type PersonalRecord,
  type WeightPoint,
} from "@/components/client/client-highlights";
import { ClientNutritionSummary } from "@/components/client/client-nutrition-summary";
import type { NutritionTotals } from "@/lib/types/client-nutrition";

interface SessionRef {
  id: string;
  assignment_id: string;
  routine_id: string;
  session_date: string;
}

/**
 * El día de "hoy" se calcula aquí, en el navegador — no en el
 * servidor. Si se calculara en el Server Component (hora del
 * servidor, normalmente UTC) podía no coincidir con el día real del
 * cliente según su zona horaria local (p. ej. de noche, cuando en UTC
 * ya es el día siguiente pero localmente sigue siendo hoy), y la
 * rutina del día "desaparecía" en Inicio aunque sí apareciera en la
 * Agenda (que ya calculaba el día así). Mismo patrón que ClientAgenda.
 */
export function ClientHomeToday({
  firstName,
  assignments,
  inProgressSessions,
  recentCompletedSessions,
  monthCompletedSessions,
  completedSetDates,
  records,
  weightPoints,
  nutritionTotals,
  calorieTarget,
}: {
  firstName: string;
  assignments: CalendarAssignment[];
  inProgressSessions: SessionRef[];
  recentCompletedSessions: SessionRef[];
  monthCompletedSessions: CompletedSessionDay[];
  completedSetDates: string[];
  records: PersonalRecord[];
  weightPoints: WeightPoint[];
  nutritionTotals: NutritionTotals | null;
  calorieTarget: number | null;
}) {
  const today = useMemo(() => todayKey(), []);
  const todaySessions = useMemo(
    () => sessionsInRange(assignments, today, today),
    [assignments, today],
  );

  // La siguiente sesión programada, para que un día de descanso no sea
  // un callejón sin salida. Se mira un mes hacia adelante: si en 30 días
  // no hay nada, es que el programa ya terminó o no tiene asignaciones.
  const nextSession = useMemo(() => {
    if (todaySessions.length > 0) return null;
    const upcoming = sessionsInRange(assignments, addDays(today, 1), addDays(today, 30));
    return upcoming.length > 0
      ? upcoming.reduce((first, s) => (compareKeys(s.date, first.date) < 0 ? s : first))
      : null;
  }, [assignments, today, todaySessions]);

  const inProgressByKey = useMemo(
    () => new Map(inProgressSessions.map((s) => [`${s.assignment_id}:${s.routine_id}:${s.session_date}`, s.id])),
    [inProgressSessions],
  );
  const completedByKey = useMemo(
    () =>
      new Map(
        recentCompletedSessions
          .filter((s) => s.session_date === today)
          .map((s) => [`${s.assignment_id}:${s.routine_id}:${s.session_date}`, s.id]),
      ),
    [recentCompletedSessions, today],
  );

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
            {nextSession ? (
              <div className="mt-2 flex flex-col items-center gap-0.5 border-t pt-3 text-sm">
                <span className="text-xs text-muted-foreground">Tu próximo entrenamiento</span>
                <span className="font-medium">{nextSession.routineName}</span>
                <span className="text-xs text-primary">{formatDate(nextSession.date)}</span>
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {todaySessions.map((session) => {
            const key = `${session.assignmentId}:${session.routineId}:${session.date}`;
            const inProgressId = inProgressByKey.get(key);
            const completedSessionId = completedByKey.get(key);
            const href = completedSessionId
              ? `/cliente/entrenamiento/sesion/${completedSessionId}`
              : `/cliente/entrenamiento/sesion/preview?assignment=${session.assignmentId}&routine=${session.routineId}&date=${session.date}`;
            return (
              <Link key={key} href={href}>
                <Card className="overflow-hidden transition-colors hover:bg-accent/40">
                  <CardContent className="flex items-center gap-3 p-4">
                    <div
                      className={
                        completedSessionId
                          ? "flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary"
                          : "flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"
                      }
                    >
                      {completedSessionId ? <Check className="size-5" /> : <Dumbbell className="size-5" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{session.routineName}</p>
                      {completedSessionId ? (
                        <p className="truncate text-xs text-primary">Completada</p>
                      ) : inProgressId ? (
                        <p className="truncate text-xs text-primary">En curso</p>
                      ) : session.isProgram && session.programName ? (
                        <p className="truncate text-xs text-muted-foreground">{session.programName}</p>
                      ) : null}
                    </div>
                    <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}

      <Link
        href="/cliente/agenda"
        className="text-center text-sm font-medium text-primary hover:underline"
      >
        Ver agenda de entrenamiento
      </Link>

      {nutritionTotals ? (
        <ClientNutritionSummary totals={nutritionTotals} calorieTarget={calorieTarget} />
      ) : null}

      <ClientMonthActivity
        today={today}
        assignments={assignments}
        completedSessions={monthCompletedSessions}
        completedSetDates={completedSetDates}
      />

      <ClientRecords records={records} />

      <ClientWeightTrend points={weightPoints} />
    </div>
  );
}
