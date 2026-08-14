"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Search, SlidersHorizontal, TrendingUp } from "lucide-react";

import { muscleGroupLabel, formatDate, formatMonthYear } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ClientExerciseProgress } from "@/lib/types/client-panel";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { ProgressLineChart } from "@/components/trainer/progress-line-chart";

function monthKey(dateKey: string) {
  return dateKey.slice(0, 7); // 'YYYY-MM'
}

export function ClientExerciseEvolution({
  exerciseProgress,
}: {
  exerciseProgress: ClientExerciseProgress[];
}) {
  const [query, setQuery] = useState("");
  const [muscleFilter, setMuscleFilter] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const muscleGroups = useMemo(
    () => Array.from(new Set(exerciseProgress.map((e) => e.muscleGroup))).sort(),
    [exerciseProgress],
  );

  const filtered = useMemo(
    () =>
      exerciseProgress.filter(
        (e) =>
          (!query || e.exerciseName.toLowerCase().includes(query.toLowerCase())) &&
          (!muscleFilter || e.muscleGroup === muscleFilter),
      ),
    [exerciseProgress, query, muscleFilter],
  );

  const selected = exerciseProgress.find((e) => e.exerciseId === selectedId) ?? null;

  if (selected) {
    return <ExerciseMonthChart exercise={selected} onBack={() => setSelectedId(null)} />;
  }

  if (exerciseProgress.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
          <TrendingUp className="size-8 text-muted-foreground" />
          <p className="font-medium">Todavía no hay ejercicios registrados</p>
          <p className="text-sm text-muted-foreground">
            Cuando completes series con peso en una sesión, aparecerán aquí.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <div className="relative min-w-0 flex-1">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar ejercicio"
            className="pl-9"
          />
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label="Filtros"
          className="relative shrink-0"
          onClick={() => setFiltersOpen(true)}
        >
          <SlidersHorizontal className="size-4" />
          {muscleFilter && <span className="absolute -top-1 -right-1 size-2.5 rounded-full bg-primary" />}
        </Button>
      </div>

      <ResponsiveDialog open={filtersOpen} onOpenChange={setFiltersOpen} title="Filtrar por grupo muscular">
        <div className="flex flex-wrap gap-2 pb-2">
          <button
            type="button"
            onClick={() => {
              setMuscleFilter(null);
              setFiltersOpen(false);
            }}
            className={cn(
              "rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
              !muscleFilter ? "border-primary bg-primary text-primary-foreground" : "text-muted-foreground",
            )}
          >
            Todos
          </button>
          {muscleGroups.map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => {
                setMuscleFilter(g);
                setFiltersOpen(false);
              }}
              className={cn(
                "rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
                muscleFilter === g
                  ? "border-primary bg-primary text-primary-foreground"
                  : "text-muted-foreground",
              )}
            >
              {muscleGroupLabel(g)}
            </button>
          ))}
        </div>
      </ResponsiveDialog>

      {filtered.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">Sin resultados.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((exercise) => (
            <button
              key={exercise.exerciseId}
              type="button"
              onClick={() => setSelectedId(exercise.exerciseId)}
              className="text-left"
            >
              <Card className="transition-colors hover:bg-accent/40">
                <CardContent className="flex items-center gap-3 p-4">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <TrendingUp className="size-4.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{exercise.exerciseName}</p>
                    <p className="text-xs text-muted-foreground">{muscleGroupLabel(exercise.muscleGroup)}</p>
                  </div>
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                </CardContent>
              </Card>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ExerciseMonthChart({
  exercise,
  onBack,
}: {
  exercise: ClientExerciseProgress;
  onBack: () => void;
}) {
  const monthsDesc = useMemo(() => {
    const set = new Set(exercise.logs.map((l) => monthKey(l.date)));
    return Array.from(set).sort().reverse();
  }, [exercise]);

  const [selectedMonth, setSelectedMonth] = useState(monthsDesc[0] ?? "");

  const monthPoints = useMemo(
    () =>
      exercise.logs
        .filter((l) => monthKey(l.date) === selectedMonth)
        .map((l) => ({ label: formatDate(l.date), value: l.weight })),
    [exercise, selectedMonth],
  );

  const bestInMonth = monthPoints.length > 0 ? Math.max(...monthPoints.map((p) => p.value)) : null;

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" />
        {exercise.exerciseName}
      </button>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {monthsDesc.map((m) => {
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
        <CardContent className="flex flex-col gap-3">
          {bestInMonth !== null && (
            <p className="text-xs text-muted-foreground">
              Máximo del mes: <span className="font-semibold text-foreground">{bestInMonth} kg</span>
            </p>
          )}
          <ProgressLineChart unit="kg" points={monthPoints} emptyMessage="Sin registros en este mes." />
        </CardContent>
      </Card>
    </div>
  );
}
