"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronLeft } from "lucide-react";

import { formatDate, formatMonthYear } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SwipeableChartPair } from "@/components/client/swipeable-chart-pair";

export interface ExerciseHistorySetRow {
  setNumber: number;
  actual_reps: number | null;
  actual_weight: number | null;
  actual_minutes: number | null;
  actual_level: number | null;
}

export interface ExerciseHistorySession {
  date: string;
  sets: ExerciseHistorySetRow[];
}

function monthKey(date: string) {
  return date.slice(0, 7);
}

export function ExerciseHistoryPageView({
  exerciseName,
  targetSummary,
  cardio,
  sessions,
}: {
  exerciseName: string;
  targetSummary?: string;
  cardio: boolean;
  sessions: ExerciseHistorySession[];
}) {
  const router = useRouter();

  const months = useMemo(() => {
    const set = new Set(sessions.map((s) => monthKey(s.date)));
    return Array.from(set).sort().reverse();
  }, [sessions]);

  const [selectedMonth, setSelectedMonth] = useState(months[0] ?? "");
  const [expanded, setExpanded] = useState<Set<string>>(new Set(sessions[0] ? [sessions[0].date] : []));

  const monthSessions = useMemo(
    () => sessions.filter((s) => monthKey(s.date) === selectedMonth),
    [sessions, selectedMonth],
  );

  const chartPages = useMemo(() => {
    const sorted = [...monthSessions].sort((a, b) => a.date.localeCompare(b.date));
    if (cardio) {
      return [
        {
          label: "Minutos",
          unit: "min",
          points: sorted.map((s) => ({
            label: formatDate(s.date),
            value: Math.max(0, ...s.sets.map((set) => set.actual_minutes ?? 0)),
          })),
        },
        {
          label: "Nivel",
          points: sorted.map((s) => ({
            label: formatDate(s.date),
            value: Math.max(0, ...s.sets.map((set) => set.actual_level ?? 0)),
          })),
        },
      ] as [{ label: string; unit?: string; points: { label: string; value: number }[] }, { label: string; unit?: string; points: { label: string; value: number }[] }];
    }
    return [
      {
        label: "Peso",
        unit: "kg",
        points: sorted.map((s) => ({
          label: formatDate(s.date),
          value: Math.max(0, ...s.sets.map((set) => set.actual_weight ?? 0)),
        })),
      },
      {
        label: "Repeticiones",
        points: sorted.map((s) => ({
          label: formatDate(s.date),
          value: Math.max(0, ...s.sets.map((set) => set.actual_reps ?? 0)),
        })),
      },
    ] as [{ label: string; unit?: string; points: { label: string; value: number }[] }, { label: string; unit?: string; points: { label: string; value: number }[] }];
  }, [monthSessions, cardio]);

  return (
    <div className="mx-auto flex max-w-md flex-col gap-4 p-4 pb-24">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="shrink-0" onClick={() => router.back()} aria-label="Regresar">
          <ChevronLeft className="size-5" />
        </Button>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{exerciseName}</p>
          {targetSummary ? <p className="text-xs text-muted-foreground">{targetSummary}</p> : null}
        </div>
      </div>

      {sessions.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Todavía no tienes sesiones completadas de este ejercicio.
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {months.map((m) => {
              const [y, mo] = m.split("-").map(Number);
              const active = m === selectedMonth;
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => setSelectedMonth(m)}
                  className={cn(
                    "shrink-0 rounded-full px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors",
                    active ? "bg-foreground text-background" : "bg-muted text-muted-foreground hover:text-foreground",
                  )}
                >
                  {formatMonthYear(y, mo)}
                </button>
              );
            })}
          </div>

          <Card>
            <CardContent>
              <SwipeableChartPair pages={chartPages} />
            </CardContent>
          </Card>

          <div className="flex flex-col gap-2">
            {monthSessions.map((session) => {
              const isOpen = expanded.has(session.date);
              return (
                <div key={session.date} className="glass-card overflow-hidden rounded-xl">
                  <button
                    type="button"
                    className="flex w-full items-center gap-3 px-4 py-3 text-left"
                    onClick={() =>
                      setExpanded((prev) => {
                        const next = new Set(prev);
                        if (next.has(session.date)) next.delete(session.date);
                        else next.add(session.date);
                        return next;
                      })
                    }
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{formatDate(session.date)}</p>
                    </div>
                    <p className="shrink-0 text-sm font-semibold tabular-nums text-primary">
                      {cardio
                        ? `${Math.max(0, ...session.sets.map((s) => s.actual_minutes ?? 0))} min`
                        : `${Math.max(0, ...session.sets.map((s) => s.actual_weight ?? 0))} kg`}
                    </p>
                    <ChevronDown
                      className={cn("size-4 shrink-0 text-muted-foreground transition-transform", isOpen && "rotate-180")}
                    />
                  </button>

                  {isOpen ? (
                    <div className="border-t px-4 py-3">
                      {targetSummary ? (
                        <p className="mb-2 text-xs font-medium text-muted-foreground">{targetSummary}</p>
                      ) : null}
                      <div className="grid grid-cols-[1.5rem_1fr_1fr] items-center gap-2 pb-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                        <span>#</span>
                        <span>{cardio ? "Minutos" : "Peso"}</span>
                        <span>{cardio ? "Nivel" : "Reps"}</span>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        {session.sets
                          .slice()
                          .sort((a, b) => a.setNumber - b.setNumber)
                          .map((set) => (
                            <div
                              key={set.setNumber}
                              className="grid grid-cols-[1.5rem_1fr_1fr] items-center gap-2 text-sm"
                            >
                              <span className="text-muted-foreground">{set.setNumber}</span>
                              <span className="tabular-nums">
                                {cardio
                                  ? (set.actual_minutes ? `${set.actual_minutes} min` : "—")
                                  : set.actual_weight
                                    ? `${set.actual_weight} kg`
                                    : "—"}
                              </span>
                              <span className="tabular-nums">
                                {cardio ? (set.actual_level ?? "—") : (set.actual_reps ?? "—")}
                              </span>
                            </div>
                          ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
