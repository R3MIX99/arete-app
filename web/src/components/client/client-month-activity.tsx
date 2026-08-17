"use client";

import { useMemo } from "react";
import { Dumbbell, Flame, Layers, Timer } from "lucide-react";

import { addDays, compareKeys, sessionsInRange, toKey, type CalendarAssignment } from "@/lib/calendar-logic";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";

export interface CompletedSessionDay {
  date: string;
  durationSeconds: number | null;
}

const MONTH_NAMES = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

/** Racha de días seguidos entrenando que termina hoy (o ayer — no se
 * rompe hasta que se pierde un día completo, si no la racha se veria
 * "rota" todas las mañanas antes de entrenar). */
function currentStreak(doneDates: Set<string>, today: string): number {
  let streak = 0;
  let cursor = doneDates.has(today) ? today : addDays(today, -1);
  while (doneDates.has(cursor)) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

/**
 * Cuadrícula del mes en curso: un cuadrito por día, para ver de un
 * vistazo qué días entrenó, cuáles tenía programados y no hizo, y
 * cuáles eran de descanso. Todo se calcula con el día del navegador
 * (no del servidor) por el mismo motivo que el resto del panel: la
 * zona horaria del cliente puede no coincidir con la del servidor.
 */
export function ClientMonthActivity({
  today,
  assignments,
  completedSessions,
  completedSetDates,
}: {
  today: string;
  assignments: CalendarAssignment[];
  completedSessions: CompletedSessionDay[];
  completedSetDates: string[];
}) {
  const [year, month] = useMemo(() => {
    const [y, m] = today.split("-").map(Number);
    return [y, m] as const;
  }, [today]);

  const monthStart = toKey(year, month, 1);
  const daysInMonth = useMemo(() => new Date(year, month, 0).getDate(), [year, month]);
  const monthEnd = toKey(year, month, daysInMonth);

  // Días con al menos una sesión completada.
  const doneDates = useMemo(
    () => new Set(completedSessions.map((s) => s.date)),
    [completedSessions],
  );

  // Días que tenían rutina programada según sus asignaciones.
  const scheduledDates = useMemo(() => {
    const set = new Set<string>();
    for (const session of sessionsInRange(assignments, monthStart, monthEnd)) set.add(session.date);
    return set;
  }, [assignments, monthStart, monthEnd]);

  const monthCompleted = useMemo(
    () => completedSessions.filter((s) => s.date >= monthStart && s.date <= monthEnd),
    [completedSessions, monthStart, monthEnd],
  );

  const totalMinutes = useMemo(
    () =>
      Math.round(
        monthCompleted.reduce((acc, s) => acc + (s.durationSeconds ?? 0), 0) / 60,
      ),
    [monthCompleted],
  );

  const totalSets = useMemo(
    () => completedSetDates.filter((d) => d >= monthStart && d <= monthEnd).length,
    [completedSetDates, monthStart, monthEnd],
  );

  const streak = useMemo(() => currentStreak(doneDates, today), [doneDates, today]);

  const days = useMemo(
    () =>
      Array.from({ length: daysInMonth }, (_, i) => {
        const date = toKey(year, month, i + 1);
        return {
          date,
          dayNumber: i + 1,
          done: doneDates.has(date),
          scheduled: scheduledDates.has(date),
          isToday: date === today,
          isPast: compareKeys(date, today) < 0,
        };
      }),
    [daysInMonth, year, month, doneDates, scheduledDates, today],
  );

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold capitalize">{MONTH_NAMES[month - 1]}</p>
            <p className="text-xs text-muted-foreground">
              {monthCompleted.length}{" "}
              {monthCompleted.length === 1 ? "entrenamiento" : "entrenamientos"} este mes
            </p>
          </div>
          {streak > 0 ? (
            <div className="flex shrink-0 items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-primary">
              <Flame className="size-3.5" />
              <span className="text-xs font-semibold tabular-nums">
                {streak} {streak === 1 ? "día" : "días"}
              </span>
            </div>
          ) : null}
        </div>

        <div className="grid grid-cols-7 gap-1.5">
          {days.map((day) => (
            <div
              key={day.date}
              title={`${day.dayNumber} — ${
                day.done
                  ? "entrenaste"
                  : day.scheduled
                    ? day.isPast
                      ? "tenías rutina y no la hiciste"
                      : "tienes rutina programada"
                    : "descanso"
              }`}
              className={cn(
                "flex aspect-square items-center justify-center rounded-md text-[11px] font-medium tabular-nums transition-colors",
                day.done
                  ? "bg-primary text-primary-foreground"
                  : day.scheduled && day.isPast
                    // Programado y ya pasó sin hacerse: se marca, pero sin
                    // regañar — solo un borde, no un rojo de error.
                    ? "border border-dashed border-muted-foreground/40 text-muted-foreground"
                    : day.scheduled
                      ? "border border-primary/40 text-muted-foreground"
                      : "bg-muted/50 text-muted-foreground/60",
                day.isToday && "ring-2 ring-primary ring-offset-1 ring-offset-background",
              )}
            >
              {day.dayNumber}
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-sm bg-primary" /> Entrenaste
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-sm border border-primary/40" /> Programado
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-sm bg-muted/50" /> Descanso
          </span>
        </div>

        <div className="grid grid-cols-3 divide-x rounded-xl bg-muted/40">
          <Stat icon={Dumbbell} value={String(monthCompleted.length)} label="Sesiones" />
          <Stat icon={Timer} value={`${totalMinutes}`} label="Minutos" />
          <Stat icon={Layers} value={String(totalSets)} label="Series" />
        </div>
      </CardContent>
    </Card>
  );
}

function Stat({
  icon: Icon,
  value,
  label,
}: {
  icon: typeof Dumbbell;
  value: string;
  label: string;
}) {
  return (
    <div className="flex flex-col items-center gap-0.5 px-2 py-3">
      <Icon className="size-4 text-muted-foreground" />
      <span className="text-lg font-semibold tabular-nums">{value}</span>
      <span className="text-[11px] text-muted-foreground">{label}</span>
    </div>
  );
}
