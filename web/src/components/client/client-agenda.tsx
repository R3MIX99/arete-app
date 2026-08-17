"use client";

import * as React from "react";
import { CalendarDays, CalendarX, ChevronLeft, ChevronRight } from "lucide-react";

import { formatDayHeading, formatMonthYear } from "@/lib/format";
import {
  addDays,
  groupSessionsByDate,
  mondayOfWeek,
  sessionsInRange,
  todayKey,
  type CalendarAssignment,
} from "@/lib/calendar-logic";
import { useSwipeNavigation } from "@/lib/use-swipe-navigation";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { MonthCalendarGrid } from "@/components/trainer/month-calendar-grid";
import { WeekdayStrip } from "@/components/weekday-strip";
import {
  RoutineSessionCard,
  type RoutineCardMeta,
} from "@/components/client/routine-session-card";

function monthGridRange(year: number, month: number) {
  const firstOfMonth = `${year}-${String(month).padStart(2, "0")}-01`;
  const gridStart = mondayOfWeek(firstOfMonth);
  const gridEnd = addDays(gridStart, 41);
  return { gridStart, gridEnd };
}

export function ClientAgenda({
  assignments,
  inProgressByKey,
  completedByKey,
  routineMeta,
}: {
  assignments: CalendarAssignment[];
  inProgressByKey: Record<string, string>;
  completedByKey: Record<string, string>;
  routineMeta: Record<string, RoutineCardMeta>;
}) {
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
    <div
      className="flex flex-col gap-3"
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
          <Button type="button" variant="outline" className="w-fit" onClick={() => selectDate(today)}>
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
        <Button type="button" variant="ghost" size="icon" aria-label="Día anterior" onClick={() => stepDay(-1)}>
          <ChevronLeft />
        </Button>
        <p className="text-sm font-semibold">{formatDayHeading(selectedDate)}</p>
        <Button type="button" variant="ghost" size="icon" aria-label="Día siguiente" onClick={() => stepDay(1)}>
          <ChevronRight />
        </Button>
      </div>

      {daySessions.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-14 text-center text-muted-foreground">
          <CalendarX className="size-8" />
          <p className="text-sm">No tienes entrenamiento programado este día.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {daySessions.map((session) => {
            const key = `${session.assignmentId}:${session.routineId}:${session.date}`;
            const inProgressId = inProgressByKey[key];
            const completedSessionId = completedByKey[key];
            const href = completedSessionId
              ? `/cliente/entrenamiento/sesion/${completedSessionId}`
              : `/cliente/entrenamiento/sesion/preview?assignment=${session.assignmentId}&routine=${session.routineId}&date=${session.date}`;
            return (
              <RoutineSessionCard
                key={key}
                href={href}
                routineName={session.routineName}
                subtitle={session.isProgram ? (session.programName ?? null) : null}
                meta={routineMeta[session.routineId]}
                status={
                  completedSessionId ? "completed" : inProgressId ? "in_progress" : "not_started"
                }
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
