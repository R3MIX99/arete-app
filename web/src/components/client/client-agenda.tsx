"use client";

import * as React from "react";
import Link from "next/link";
import { CalendarDays, CalendarX, Check, ChevronLeft, ChevronRight, Dumbbell } from "lucide-react";

import { formatDayHeading, formatMonthYear } from "@/lib/format";
import {
  addDays,
  groupSessionsByDate,
  mondayOfWeek,
  sessionsInRange,
  todayKey,
  type CalendarAssignment,
} from "@/lib/calendar-logic";
import { cn } from "@/lib/utils";
import { useSwipeNavigation } from "@/lib/use-swipe-navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { MonthCalendarGrid } from "@/components/trainer/month-calendar-grid";

const WEEKDAY_LABELS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

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
}: {
  assignments: CalendarAssignment[];
  inProgressByKey: Record<string, string>;
  completedByKey: Record<string, string>;
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

  // Los 7 días de la semana del día elegido, de lunes a domingo. Se
  // calcula sobre `selectedDate` y no sobre hoy: así, al moverse con las
  // flechas o el swipe, la tira sigue al día elegido y cambia de semana
  // sola cuando toca. Las sesiones se consultan aparte de las del mes
  // porque la semana puede cruzar dos meses.
  const weekDays = React.useMemo(() => {
    const monday = mondayOfWeek(selectedDate);
    const weekSessionKeys = new Set(
      groupSessionsByDate(sessionsInRange(assignments, monday, addDays(monday, 6))).keys(),
    );
    return Array.from({ length: 7 }, (_, i) => {
      const key = addDays(monday, i);
      return {
        key,
        label: WEEKDAY_LABELS[i],
        dayNumber: Number(key.split("-")[2]),
        hasSession: weekSessionKeys.has(key),
        isSelected: key === selectedDate,
        isToday: key === today,
      };
    });
  }, [assignments, selectedDate, today]);

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

      <div className="flex justify-between gap-1">
        {weekDays.map((day) => (
          <button
            key={day.key}
            type="button"
            onClick={() => selectDate(day.key)}
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
            {/* El punto marca que ese día tiene rutina. Va siempre
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
        <div className="flex flex-col gap-2.5">
          {daySessions.map((session) => {
            const key = `${session.assignmentId}:${session.routineId}:${session.date}`;
            const inProgressId = inProgressByKey[key];
            const completedSessionId = completedByKey[key];
            const href = completedSessionId
              ? `/cliente/entrenamiento/sesion/${completedSessionId}`
              : `/cliente/entrenamiento/sesion/preview?assignment=${session.assignmentId}&routine=${session.routineId}&date=${session.date}`;
            return (
              <Link key={key} href={href}>
                <Card className="overflow-hidden transition-colors hover:bg-accent/40">
                  <CardContent className="flex items-center gap-3 p-4">
                    <div
                      className={cn(
                        "flex size-10 shrink-0 items-center justify-center rounded-xl",
                        completedSessionId ? "bg-primary/15 text-primary" : "bg-primary/10 text-primary",
                      )}
                    >
                      {completedSessionId ? <Check className="size-4.5" /> : <Dumbbell className="size-4.5" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{session.routineName}</p>
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
    </div>
  );
}
