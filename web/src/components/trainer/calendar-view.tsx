"use client";

import * as React from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";

import { formatDayHeading, formatMonthYear } from "@/lib/format";
import {
  addDays,
  groupSessionsByDate,
  mondayOfWeek,
  sessionsInRange,
  toKey,
  todayKey,
  type CalendarAssignment,
} from "@/lib/calendar-logic";
import { useSwipeNavigation } from "@/lib/use-swipe-navigation";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { MonthCalendarGrid } from "@/components/trainer/month-calendar-grid";
import { CalendarSessionList } from "@/components/trainer/calendar-session-list";
import { WeekdayStrip } from "@/components/weekday-strip";

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

  // Las sesiones de la semana se consultan aparte de las del mes porque
  // una semana puede cruzar dos meses y la rejilla mensual no las cubre.
  const weekSessionKeys = React.useMemo(() => {
    const monday = mondayOfWeek(selectedDate);
    return new Set(
      groupSessionsByDate(sessionsInRange(assignments, monday, addDays(monday, 6))).keys(),
    );
  }, [assignments, selectedDate]);

  const monthSummary = React.useMemo(() => {
    const daysInMonth = new Date(Date.UTC(cursor.year, cursor.month, 0)).getUTCDate();
    const monthStart = toKey(cursor.year, cursor.month, 1);
    const monthEnd = toKey(cursor.year, cursor.month, daysInMonth);
    const sessions = sessionsInRange(assignments, monthStart, monthEnd);
    const distinctClients = new Set(sessions.map((s) => s.clientId)).size;
    const distinctDays = new Set(sessions.map((s) => s.date)).size;
    return { total: sessions.length, distinctClients, distinctDays };
  }, [assignments, cursor]);

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

  const swipeHandlers = useSwipeNavigation(
    () => stepDay(1),
    () => stepDay(-1),
  );

  return (
    <div className="flex w-full flex-col gap-4 p-4 pb-24 md:p-8">
      {/* Teléfono: botón de mes + navegador de día arriba, lista abajo. */}
      <div
        className="flex flex-col gap-3 md:hidden"
        onTouchStart={swipeHandlers.onTouchStart}
        onTouchEnd={swipeHandlers.onTouchEnd}
      >
        <div className="flex items-center gap-2">
          <Drawer open={monthSheetOpen} onOpenChange={setMonthSheetOpen} direction="top">
            <Button
              type="button"
              variant="outline"
              className="w-fit gap-2"
              onClick={() => setMonthSheetOpen(true)}
            >
              <CalendarDays className="size-4" />
              {formatMonthYear(cursor.year, cursor.month)}
            </Button>
            <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>Elegir día</DrawerTitle>
            </DrawerHeader>
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
            </DrawerContent>
          </Drawer>
          {selectedDate !== today && (
            <Button
              type="button"
              variant="outline"
              className="w-fit"
              onClick={() => selectDate(today)}
            >
              Hoy
            </Button>
          )}
        </div>

        <WeekdayStrip
          selectedDate={selectedDate}
          today={today}
          sessionDateKeys={weekSessionKeys}
          onSelectDate={selectDate}
        />

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
        <div className="flex w-72 shrink-0 flex-col gap-4 md:sticky md:top-4 md:self-start">
          <div className="rounded-xl border bg-card p-4">
            <MonthCalendarGrid
              year={cursor.year}
              month={cursor.month}
              selectedDateKey={selectedDate}
              sessionDateKeys={sessionDateKeys}
              onSelectDate={selectDate}
              onChangeMonth={changeMonth}
            />
          </div>

          <div className="flex flex-col gap-3 rounded-xl border bg-card p-4">
            <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              Resumen de {formatMonthYear(cursor.year, cursor.month)}
            </p>
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Sesiones programadas</p>
                <p className="text-sm font-semibold tabular-nums">{monthSummary.total}</p>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Clientes con sesión</p>
                <p className="text-sm font-semibold tabular-nums">
                  {monthSummary.distinctClients}
                </p>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Días con actividad</p>
                <p className="text-sm font-semibold tabular-nums">
                  {monthSummary.distinctDays}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div
          className="flex flex-1 flex-col gap-4"
          onTouchStart={swipeHandlers.onTouchStart}
          onTouchEnd={swipeHandlers.onTouchEnd}
        >
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
