"use client";

import { useMemo } from "react";

import { addDays, mondayOfWeek } from "@/lib/calendar-logic";
import { cn } from "@/lib/utils";

const WEEKDAY_LABELS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

/**
 * Los siete días de la semana en círculos, para saltar de día de un
 * toque. Se usa igual en la agenda del cliente y en el calendario del
 * entrenador.
 *
 * La semana se arma alrededor del día SELECCIONADO, no de hoy: así, al
 * moverse con las flechas o con el swipe, la tira sigue al día elegido y
 * cambia de semana sola cuando toca.
 */
export function WeekdayStrip({
  selectedDate,
  today,
  sessionDateKeys,
  onSelectDate,
}: {
  selectedDate: string;
  today: string;
  /** Días que tienen sesión — se les pinta un punto arriba. */
  sessionDateKeys: Set<string>;
  onSelectDate: (dateKey: string) => void;
}) {
  const days = useMemo(() => {
    const monday = mondayOfWeek(selectedDate);
    return Array.from({ length: 7 }, (_, i) => {
      const key = addDays(monday, i);
      return {
        key,
        label: WEEKDAY_LABELS[i],
        dayNumber: Number(key.split("-")[2]),
        hasSession: sessionDateKeys.has(key),
        isSelected: key === selectedDate,
        isToday: key === today,
      };
    });
  }, [selectedDate, today, sessionDateKeys]);

  return (
    <div className="flex justify-between gap-1">
      {days.map((day) => (
        <button
          key={day.key}
          type="button"
          onClick={() => onSelectDate(day.key)}
          aria-label={`${day.label} ${day.dayNumber}`}
          aria-current={day.isSelected ? "date" : undefined}
          className="flex flex-1 flex-col items-center gap-1"
        >
          <span
            className={cn(
              "text-[11px] font-medium",
              day.isSelected ? "text-foreground" : "text-muted-foreground",
            )}
          >
            {day.label}
          </span>
          {/* El punto marca que ese día tiene sesión. Va siempre
              presente y transparente cuando no hay, para que los
              círculos no se muevan de sitio al cambiar de día. */}
          <span
            className={cn(
              "size-1.5 rounded-full",
              day.hasSession ? "bg-primary" : "bg-transparent",
            )}
          />
          <span
            className={cn(
              "flex size-9 items-center justify-center rounded-full text-sm font-medium tabular-nums transition-colors",
              day.isSelected
                ? "bg-primary text-primary-foreground"
                : day.isToday
                  ? "border border-primary text-primary"
                  : "text-foreground hover:bg-accent",
            )}
          >
            {day.dayNumber}
          </span>
        </button>
      ))}
    </div>
  );
}
