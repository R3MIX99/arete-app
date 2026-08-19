"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronRight, Search, SlidersHorizontal, TrendingUp } from "lucide-react";

import { formatDate, muscleGroupLabel } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ClientExerciseProgress } from "@/lib/types/client-panel";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { ThumbnailImage } from "@/components/client/thumbnail-image";

export function ClientExerciseEvolution({
  exerciseProgress,
}: {
  exerciseProgress: ClientExerciseProgress[];
}) {
  const [query, setQuery] = useState("");
  const [muscleFilter, setMuscleFilter] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);

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

  if (exerciseProgress.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-10 text-center">
        <TrendingUp className="size-8 text-muted-foreground" />
        <p className="font-medium">Todavía no hay ejercicios registrados</p>
        <p className="text-sm text-muted-foreground">
          Cuando completes series con peso en una sesión, aparecerán aquí.
        </p>
      </div>
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
        // Sin tarjetas, pero con la misma pinta que la vista previa de un
        // ejercicio de rutina: foto a la izquierda, nombre arriba, peso y
        // reps de la serie más reciente debajo, y la fecha de ese
        // registro abajo en gris clarito.
        <div className="flex flex-col">
          {filtered.map((exercise) => (
            <Link
              key={exercise.exerciseId}
              href={`/cliente/entrenamiento/evolucion/${exercise.exerciseId}?name=${encodeURIComponent(exercise.exerciseName)}&muscle=${encodeURIComponent(exercise.muscleGroup)}`}
              className="flex items-center gap-3 py-3.5 transition-colors hover:bg-accent/40"
            >
              <div className="relative size-14 shrink-0 overflow-hidden rounded-xl bg-primary/10">
                {exercise.imageUrl ? (
                  <ThumbnailImage
                    src={exercise.imageUrl}
                    fallbackSrc={exercise.imageFallbackUrl}
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-primary">
                    <TrendingUp className="size-5" />
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{exercise.exerciseName}</p>
                {exercise.currentWeight !== null ? (
                  <p className="mt-0.5 truncate text-sm font-medium text-primary tabular-nums">
                    {exercise.currentWeight} kg
                    {exercise.currentReps !== null ? ` × ${exercise.currentReps} reps` : ""}
                  </p>
                ) : (
                  <p className="mt-0.5 truncate text-sm text-muted-foreground">
                    {muscleGroupLabel(exercise.muscleGroup)}
                  </p>
                )}
                {exercise.lastDate ? (
                  <p className="mt-0.5 truncate text-xs text-muted-foreground/70">
                    {formatDate(exercise.lastDate)}
                  </p>
                ) : null}
              </div>
              <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
