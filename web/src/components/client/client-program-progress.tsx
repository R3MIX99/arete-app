"use client";

import { useMemo } from "react";
import { CalendarRange } from "lucide-react";

import { compareKeys, daysBetween, mondayOfWeek, type CalendarAssignment } from "@/lib/calendar-logic";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";

/**
 * En qué semana del programa va el cliente.
 *
 * OJO: un programa NO termina — su patrón de `duration_weeks` semanas se
 * repite en ciclo hasta que el entrenador cambie la asignación (así lo
 * define sessionsInRange). Por eso esto muestra la posición dentro del
 * ciclo ("Semana 2 de 4") y nunca un porcentaje de "completado", que
 * daría a entender que el plan se acaba.
 */
export function ClientProgramProgress({
  today,
  assignments,
}: {
  today: string;
  assignments: CalendarAssignment[];
}) {
  const program = useMemo(() => {
    const active = assignments.filter(
      (a) =>
        a.isProgram &&
        (a.programDurationWeeks ?? 0) > 0 &&
        compareKeys(a.startDate, today) <= 0,
    );
    if (active.length === 0) return null;

    // Si hubiera más de uno, gana el que empezó más tarde: es el que el
    // entrenador le asignó más recientemente.
    const assignment = active.reduce((latest, a) =>
      compareKeys(a.startDate, latest.startDate) > 0 ? a : latest,
    );

    const totalWeeks = assignment.programDurationWeeks!;
    // La semana 1 arranca el lunes de la semana de start_date, igual que
    // en el cálculo del calendario.
    const weeksElapsed = Math.floor(
      daysBetween(mondayOfWeek(assignment.startDate), mondayOfWeek(today)) / 7,
    );
    const currentWeek = (weeksElapsed % totalWeeks) + 1;
    const cyclesDone = Math.floor(weeksElapsed / totalWeeks);

    return { name: assignment.programName, currentWeek, totalWeeks, cyclesDone };
  }, [assignments, today]);

  if (!program) return null;

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 p-4">
        <div className="flex items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <CalendarRange className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{program.name}</p>
            <p className="text-xs text-muted-foreground">
              Semana {program.currentWeek} de {program.totalWeeks}
              {program.cyclesDone > 0
                ? ` · ${program.cyclesDone + 1}ª vuelta al programa`
                : ""}
            </p>
          </div>
        </div>

        <div className="flex gap-1.5">
          {Array.from({ length: program.totalWeeks }, (_, i) => (
            <div
              key={i}
              className={cn(
                "h-1.5 flex-1 rounded-full",
                i + 1 < program.currentWeek
                  ? "bg-primary/40"
                  : i + 1 === program.currentWeek
                    ? "bg-primary"
                    : "bg-muted",
              )}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
