"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { formatMonthYear } from "@/lib/format";
import { toKey, todayKey } from "@/lib/calendar-logic";
import { useSwipeNavigation } from "@/lib/use-swipe-navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const WEEKDAY_LABELS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

/**
 * Grilla de un mes con un punto bajo cada día que tiene al menos una
 * sesión — el mismo patrón del selector de calendario de Apple Health,
 * reutilizado tanto en la hoja móvil como en el panel fijo de
 * escritorio.
 */
export function MonthCalendarGrid({
  year,
  month,
  selectedDateKey,
  sessionDateKeys,
  onSelectDate,
  onChangeMonth,
}: {
  year: number;
  month: number; // 1-12
  selectedDateKey: string;
  sessionDateKeys: Set<string>;
  onSelectDate: (key: string) => void;
  onChangeMonth: (year: number, month: number) => void;
}) {
  const today = todayKey();

  const cells = React.useMemo(() => {
    const firstOfMonth = new Date(Date.UTC(year, month - 1, 1));
    const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
    // ISO: lunes = 0 ... domingo = 6, para alinear con encabezados Lun..Dom.
    const firstWeekday = (firstOfMonth.getUTCDay() + 6) % 7;

    const list: { key: string | null; day: number | null }[] = [];
    for (let i = 0; i < firstWeekday; i++) list.push({ key: null, day: null });
    for (let day = 1; day <= daysInMonth; day++) {
      list.push({ key: toKey(year, month, day), day });
    }
    return list;
  }, [year, month]);

  function goToPrevMonth() {
    const prev = new Date(Date.UTC(year, month - 2, 1));
    onChangeMonth(prev.getUTCFullYear(), prev.getUTCMonth() + 1);
  }

  function goToNextMonth() {
    const next = new Date(Date.UTC(year, month, 1));
    onChangeMonth(next.getUTCFullYear(), next.getUTCMonth() + 1);
  }

  function goToToday() {
    const [y, m] = today.split("-").map(Number);
    onChangeMonth(y, m);
    onSelectDate(today);
  }

  const swipeHandlers = useSwipeNavigation(goToNextMonth, goToPrevMonth);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="rounded-full"
          aria-label="Mes anterior"
          onClick={goToPrevMonth}
        >
          <ChevronLeft className="size-4" />
        </Button>
        <p className="text-sm font-semibold">{formatMonthYear(year, month)}</p>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="rounded-full"
          aria-label="Mes siguiente"
          onClick={goToNextMonth}
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>

      <div
        className="grid grid-cols-7 gap-y-1 text-center"
        onTouchStart={swipeHandlers.onTouchStart}
        onTouchEnd={swipeHandlers.onTouchEnd}
      >
        {WEEKDAY_LABELS.map((label) => (
          <span key={label} className="text-[11px] font-medium text-muted-foreground">
            {label}
          </span>
        ))}
        {cells.map((cell, index) => {
          if (!cell.key) return <span key={`empty-${index}`} />;
          const isSelected = cell.key === selectedDateKey;
          const isToday = cell.key === today;
          const hasSession = sessionDateKeys.has(cell.key);
          return (
            <button
              key={cell.key}
              type="button"
              onClick={() => onSelectDate(cell.key!)}
              className="flex flex-col items-center gap-0.5 py-1"
            >
              <span
                className={cn(
                  "flex size-8 items-center justify-center rounded-full text-sm transition-colors",
                  isSelected
                    ? "bg-primary font-semibold text-primary-foreground"
                    : isToday
                      ? "border border-primary font-semibold text-foreground"
                      : "text-foreground hover:bg-accent",
                )}
              >
                {cell.day}
              </span>
              <span
                className={cn(
                  "size-1 rounded-full",
                  hasSession ? "bg-primary" : "bg-transparent",
                )}
              />
            </button>
          );
        })}
      </div>

      <Button type="button" variant="outline" size="sm" className="w-fit" onClick={goToToday}>
        Hoy
      </Button>
    </div>
  );
}
