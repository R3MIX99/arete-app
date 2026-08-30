"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { todayKey, toKey } from "@/lib/calendar-logic";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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

/**
 * Cuadrícula mensual de asistencia para el panel del entrenador: un
 * cuadrito por día con sesión completada, distinguiendo si el cliente
 * terminó toda la rutina (verde sólido) o se quedó a medias — p. ej. hizo
 * la fuerza pero se saltó el cardio (ámbar, con el detalle de qué grupo
 * quedó pendiente en el tooltip). Si un día tiene más de una sesión, se
 * marca incompleto en cuanto alguna de las dos lo esté.
 */
export function ClientAttendanceCalendar({
  completedSessions,
}: {
  completedSessions: CompletedSessionRow[];
}) {
  const today = useMemo(() => todayKey(), []);
  const [cursor, setCursor] = useState(() => {
    const [y, m] = today.split("-").map(Number);
    return { year: y, month: m };
  });

  const monthStart = toKey(cursor.year, cursor.month, 1);
  const daysInMonth = useMemo(
    () => new Date(cursor.year, cursor.month, 0).getDate(),
    [cursor.year, cursor.month],
  );
  const monthEnd = toKey(cursor.year, cursor.month, daysInMonth);

  const byDate = useMemo(() => {
    const map = new Map<string, { complete: boolean; missing: Set<string> }>();
    for (const session of completedSessions) {
      if (session.sessionDate < monthStart || session.sessionDate > monthEnd) continue;
      const complete = session.incompleteMuscleGroups.length === 0;
      const entry = map.get(session.sessionDate) ?? { complete: true, missing: new Set<string>() };
      entry.complete = entry.complete && complete;
      for (const group of session.incompleteMuscleGroups) entry.missing.add(group);
      map.set(session.sessionDate, entry);
    }
    return map;
  }, [completedSessions, monthStart, monthEnd]);

  const monthCompletedCount = byDate.size;
  const monthPartialCount = Array.from(byDate.values()).filter((d) => !d.complete).length;

  const days = useMemo(
    () =>
      Array.from({ length: daysInMonth }, (_, i) => {
        const date = toKey(cursor.year, cursor.month, i + 1);
        return { date, dayNumber: i + 1, attendance: byDate.get(date) ?? null, isToday: date === today };
      }),
    [daysInMonth, cursor.year, cursor.month, byDate, today],
  );

  // Relleno para que el día 1 caiga en su columna real de la semana
  // (lunes primero) en vez de siempre empezar en la primera columna.
  const leadingBlanks = (new Date(cursor.year, cursor.month - 1, 1).getDay() + 6) % 7;

  function shiftMonth(delta: number) {
    setCursor((c) => {
      const zeroBased = c.month - 1 + delta;
      const year = c.year + Math.floor(zeroBased / 12);
      const month = ((zeroBased % 12) + 12) % 12 + 1;
      return { year, month };
    });
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

        {/* grid-cols con minmax(0, 2rem) en vez de 1fr: las celdas se
            quedan chicas (cuadritos de calendario, no botones) y no se
            estiran a ocupar todo el ancho de la tarjeta. */}
        <div className="grid gap-1 [grid-template-columns:repeat(7,minmax(0,2rem))]">
          {Array.from({ length: leadingBlanks }, (_, i) => (
            <div key={`blank-${i}`} />
          ))}
          {days.map((day) => {
            const attendance = day.attendance;
            const missingLabel = attendance && !attendance.complete
              ? `Le faltó: ${Array.from(attendance.missing).join(", ")}`
              : null;
            return (
              <div
                key={day.date}
                title={`${day.dayNumber} — ${
                  attendance === null
                    ? "sin sesión registrada"
                    : attendance.complete
                      ? "rutina completa"
                      : missingLabel ?? "rutina incompleta"
                }`}
                className={cn(
                  "flex aspect-square items-center justify-center rounded text-[10px] font-medium tabular-nums transition-colors",
                  attendance === null
                    ? "bg-muted/50 text-muted-foreground/60"
                    : attendance.complete
                      ? "bg-primary text-primary-foreground"
                      : "bg-warning/14 text-warning border border-warning/50",
                  day.isToday && "ring-2 ring-primary ring-offset-1 ring-offset-background",
                )}
              >
                {day.dayNumber}
              </div>
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
            <span className="size-2.5 rounded-sm bg-muted/50" /> Sin sesión
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
