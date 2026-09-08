"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, CalendarX } from "lucide-react";

import {
  sessionsInRange,
  todayKey,
  toKey,
  type CalendarAssignment,
} from "@/lib/calendar-logic";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TrainerSessionDetailSheetContent } from "@/components/trainer/trainer-session-detail-sheet-content";
import type { CompletedSessionRow } from "@/lib/types/client-panel";

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

interface DayAttendance {
  complete: boolean;
  missing: Set<string>;
  sessions: CompletedSessionRow[];
}

/**
 * Cuadrícula mensual de asistencia para el panel del entrenador: un
 * cuadrito por día, distinguiendo si el cliente terminó toda la rutina
 * (verde sólido), se quedó a medias (ámbar), tenía algo programado y no
 * lo hizo (borde punteado), o no tenía nada ese día. Al hacerle clic a
 * cualquier día con información (con sesión o con algo programado), el
 * detalle se abre hacia abajo, dentro de la misma tarjeta — no en un
 * panel aparte — y si hubo más de una sesión ese día, se listan todas.
 */
export function ClientAttendanceCalendar({
  clientId,
  completedSessions,
  assignments,
}: {
  clientId: string;
  completedSessions: CompletedSessionRow[];
  assignments: CalendarAssignment[];
}) {
  const today = useMemo(() => todayKey(), []);
  const [cursor, setCursor] = useState(() => {
    const [y, m] = today.split("-").map(Number);
    return { year: y, month: m };
  });
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const monthStart = toKey(cursor.year, cursor.month, 1);
  const daysInMonth = useMemo(
    () => new Date(cursor.year, cursor.month, 0).getDate(),
    [cursor.year, cursor.month],
  );
  const monthEnd = toKey(cursor.year, cursor.month, daysInMonth);

  const byDate = useMemo(() => {
    const map = new Map<string, DayAttendance>();
    for (const session of completedSessions) {
      if (session.sessionDate < monthStart || session.sessionDate > monthEnd) continue;
      const complete = session.incompleteMuscleGroups.length === 0;
      const entry = map.get(session.sessionDate) ?? {
        complete: true,
        missing: new Set<string>(),
        sessions: [],
      };
      entry.complete = entry.complete && complete;
      for (const group of session.incompleteMuscleGroups) entry.missing.add(group);
      entry.sessions.push(session);
      map.set(session.sessionDate, entry);
    }
    return map;
  }, [completedSessions, monthStart, monthEnd]);

  // Lo que tenía programado cada día (nombre(s) de rutina), venga o no
  // de completarse — así un día que se saltó por completo también se
  // puede abrir para ver qué se perdió.
  const scheduledByDate = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const session of sessionsInRange(assignments, monthStart, monthEnd)) {
      const list = map.get(session.date) ?? [];
      list.push(session.routineName);
      map.set(session.date, list);
    }
    return map;
  }, [assignments, monthStart, monthEnd]);

  const monthCompletedCount = byDate.size;
  const monthPartialCount = Array.from(byDate.values()).filter((d) => !d.complete).length;

  const days = useMemo(
    () =>
      Array.from({ length: daysInMonth }, (_, i) => {
        const date = toKey(cursor.year, cursor.month, i + 1);
        return {
          date,
          dayNumber: i + 1,
          attendance: byDate.get(date) ?? null,
          scheduled: scheduledByDate.get(date) ?? null,
          isToday: date === today,
        };
      }),
    [daysInMonth, cursor.year, cursor.month, byDate, scheduledByDate, today],
  );

  const selectedDay = selectedDate ? days.find((d) => d.date === selectedDate) : undefined;

  function shiftMonth(delta: number) {
    setCursor((c) => {
      const zeroBased = c.month - 1 + delta;
      const year = c.year + Math.floor(zeroBased / 12);
      const month = ((zeroBased % 12) + 12) % 12 + 1;
      return { year, month };
    });
    setSelectedDate(null);
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold capitalize">
              {MONTH_NAMES[cursor.month - 1]} {cursor.year}
            </p>
            <p className="text-xs text-muted-foreground">
              {monthCompletedCount === 0
                ? "Sin sesiones registradas este mes"
                : `${monthCompletedCount} ${monthCompletedCount === 1 ? "día asistido" : "días asistidos"}${
                    monthPartialCount > 0
                      ? ` · ${monthPartialCount} ${monthPartialCount === 1 ? "incompleto" : "incompletos"}`
                      : ""
                  }`}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-7"
              aria-label="Mes anterior"
              onClick={() => shiftMonth(-1)}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-7"
              aria-label="Mes siguiente"
              onClick={() => shiftMonth(1)}
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>

        {/* flex-wrap, no grid de 7 columnas: los cuadritos van seguidos
            de izquierda a derecha (sin alinearse al día de la semana) y
            saltan de línea solos en cuanto ya no caben más — no una fila
            fija de 7 por semana. */}
        <div className="flex flex-wrap gap-1">
          {days.map((day) => {
            const attendance = day.attendance;
            const missedScheduled = !attendance && day.scheduled !== null;
            const clickable = attendance !== null || missedScheduled;
            const missingLabel = attendance && !attendance.complete
              ? `Le faltó: ${Array.from(attendance.missing).join(", ")}`
              : null;
            return (
              <button
                key={day.date}
                type="button"
                disabled={!clickable}
                onClick={() => setSelectedDate((prev) => (prev === day.date ? null : day.date))}
                title={`${day.dayNumber} — ${
                  attendance === null
                    ? missedScheduled
                      ? `no hizo: ${day.scheduled!.join(", ")}`
                      : "sin sesión registrada"
                    : attendance.complete
                      ? "rutina completa"
                      : missingLabel ?? "rutina incompleta"
                }`}
                className={cn(
                  "flex size-8 shrink-0 items-center justify-center rounded text-[10px] font-medium tabular-nums transition-colors",
                  attendance === null
                    ? missedScheduled
                      ? "border border-dashed border-muted-foreground/50 text-muted-foreground cursor-pointer hover:bg-accent"
                      : "bg-muted/50 text-muted-foreground/60 cursor-default"
                    : attendance.complete
                      ? "bg-primary text-primary-foreground cursor-pointer hover:opacity-85"
                      : "bg-warning/14 text-warning border border-warning/50 cursor-pointer hover:opacity-85",
                  day.isToday && "ring-2 ring-primary ring-offset-1 ring-offset-background",
                  selectedDate === day.date && "outline outline-2 outline-offset-1 outline-foreground",
                )}
              >
                {day.dayNumber}
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-sm bg-primary" /> Rutina completa
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-sm border border-warning/50 bg-warning/20" /> Le faltó algo (ej. cardio)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-sm border border-dashed border-muted-foreground/50" /> No hizo lo programado
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-sm bg-muted/50" /> Sin nada programado
          </span>
        </div>

        {selectedDay ? (
          <div className="flex flex-col gap-4 border-t pt-4">
            {selectedDay.attendance ? (
              selectedDay.attendance.sessions.map((session, sessionIndex) => (
                <div
                  key={session.id}
                  className={cn(sessionIndex > 0 && "border-t pt-4")}
                >
                  <TrainerSessionDetailSheetContent
                    clientId={clientId}
                    sessionId={session.id}
                    title={session.routineName}
                    subtitle={`${selectedDay.dayNumber} de ${MONTH_NAMES[cursor.month - 1]}`}
                  />
                </div>
              ))
            ) : (
              <div className="flex items-start gap-2 text-sm text-muted-foreground">
                <CalendarX className="mt-0.5 size-4 shrink-0" />
                <p>
                  <span className="font-medium text-foreground">
                    {selectedDay.dayNumber} de {MONTH_NAMES[cursor.month - 1]}
                  </span>
                  {" — "}
                  tenía programado <span className="font-medium text-foreground">{selectedDay.scheduled?.join(", ")}</span>, no
                  quedó registrado como hecho ese día.
                </p>
              </div>
            )}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
