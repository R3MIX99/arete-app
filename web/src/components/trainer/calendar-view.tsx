"use client";

import * as React from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";

import { formatDayHeading, formatMonthYear } from "@/lib/format";
import {
  addDays,
  groupSessionsByDate,
  mondayOfWeek,
  sessionsInRange,
  todayKey,
  type CalendarAssignment,
} from "@/lib/calendar-logic";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { MonthCalendarGrid } from "@/components/trainer/month-calendar-grid";
import { CalendarSessionList } from "@/components/trainer/calendar-session-list";

/** Rejilla de 6 semanas (Lun-Dom) que contiene el mes dado. */
function monthGridRange(year: number, month: number) {
  const firstOfMonth = `${year}-${String(month).padStart(2, "0")}-01`;
  const gridStart = mondayOfWeek(firstOfMonth);
  const gridEnd = addDays(gridStart, 41);
  return { gridStart, gridEnd };
}

export function CalendarView({ assignments }: { assignments: CalendarAssignment[] }) {
  const today = React.useMemo(() => todayKey(), []);
  const [selectedDate, setSelectedDate] = React.useState(today);
  const [cursor, setCursor] = React.useState(() => {
    const [y, m] = today.split("-").map(Number);
    return { year: y, month: m };
  });
  const [monthSheetOpen, setMonthSheetOpen] = React.useState(false);

  const { gridStart, gridEnd } = React.useMemo(
    () => monthGridRange(cursor.year, cursor.month),
    [cursor],
  );

  const sessionDateKeys = React.useMemo(() => {
    const sessions = sessionsInRange(assignments, gridStart, gridEnd);
    return new Set(groupSessionsByDate(sessions).keys());
  }, [assignments, gridStart, gridEnd]);

  const daySessions = React.useMemo(
    () => sessionsInRange(assignments, selectedDate, selectedDate),
    [assignments, selectedDate],
  );

  function selectDate(key: string) {
    setSelectedDate(key);
    const [y, m] = key.split("-").map(Number);
    setCursor({ year: y, month: m });
  }

  function changeMonth(year: number, month: number) {
    setCursor({ year, month });
  }

  function stepDay(delta: number) {
    selectDate(addDays(selectedDate, delta));
  }

  return (
    <div className="flex w-full flex-col gap-4 p-4 pb-24 md:p-8">
      {/* Teléfono: botón de mes + navegador de día arriba, lista abajo. */}
      <div className="flex flex-col gap-3 md:hidden">
        <Sheet open={monthSheetOpen} onOpenChange={setMonthSheetOpen}>
          <Button
            type="button"
            variant="outline"
            className="w-fit gap-2"
            onClick={() => setMonthSheetOpen(true)}
          >
            <CalendarDays className="size-4" />
            {formatMonthYear(cursor.year, cursor.month)}
          </Button>
          <SheetContent side="bottom" className="rounded-t-2xl">
            <SheetHeader>
              <SheetTitle>Elegir día</SheetTitle>
            </SheetHeader>
            <div className="px-4 pb-6">
              <MonthCalendarGrid
                year={cursor.year}
                month={cursor.month}
                selectedDateKey={selectedDate}
                sessionDateKeys={sessionDateKeys}
                onSelectDate={(key) => {
                  selectDate(key);
                  setMonthSheetOpen(false);
                }}
                onChangeMonth={changeMonth}
              />
            </div>
          </SheetContent>
        </Sheet>

        <div className="flex items-center justify-between">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Día anterior"
            onClick={() => stepDay(-1)}
          >
            <ChevronLeft />
          </Button>
          <p className="text-sm font-semibold">{formatDayHeading(selectedDate)}</p>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Día siguiente"
            onClick={() => stepDay(1)}
          >
            <ChevronRight />
          </Button>
        </div>

        <CalendarSessionList sessions={daySessions} />
      </div>

      {/* Escritorio: mes fijo a la izquierda, día seleccionado a la derecha. */}
      <div className="hidden gap-6 md:flex">
        <div className="w-72 shrink-0 rounded-xl border bg-card p-4">
          <MonthCalendarGrid
            year={cursor.year}
            month={cursor.month}
            selectedDateKey={selectedDate}
            sessionDateKeys={sessionDateKeys}
            onSelectDate={selectDate}
            onChangeMonth={changeMonth}
          />
        </div>

        <div className="flex flex-1 flex-col gap-4">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Día anterior"
              onClick={() => stepDay(-1)}
            >
              <ChevronLeft />
            </Button>
            <p className="text-base font-semibold">{formatDayHeading(selectedDate)}</p>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Día siguiente"
              onClick={() => stepDay(1)}
            >
              <ChevronRight />
            </Button>
          </div>

          <CalendarSessionList sessions={daySessions} />
        </div>
      </div>
    </div>
  );
}
