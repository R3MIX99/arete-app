"use client";

import * as React from "react";
import Link from "next/link";
import {
  Search,
  Plus,
  ClipboardX,
  FilterX,
  Dumbbell,
  SlidersHorizontal,
  MessageSquare,
  Star,
  Flame,
  Footprints,
  Route,
} from "lucide-react";

import { levelLabel, goalLabel, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { RoutineSummaryWithFeedback } from "@/lib/types/routine";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { MobileFab } from "@/components/trainer/mobile-fab";

const LEVEL_OPTIONS = [
  { value: "beginner", label: "Principiante" },
  { value: "intermediate", label: "Intermedio" },
  { value: "advanced", label: "Avanzado" },
];

export function RoutinesBrowser({ routines }: { routines: RoutineSummaryWithFeedback[] }) {
  const [query, setQuery] = React.useState("");
  const [level, setLevel] = React.useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = React.useState(false);
  const [commentsRoutine, setCommentsRoutine] = React.useState<RoutineSummaryWithFeedback | null>(null);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return routines.filter((routine) => {
      if (level && routine.level !== level) return false;
      if (q && !routine.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [routines, query, level]);

  const hasActiveFilters = query.trim() !== "" || level !== null;

  return (
    <div className="flex w-full flex-col gap-6 p-4 pb-24 md:p-8">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-2 sm:max-w-xs">
          <div className="relative min-w-0 flex-1">
            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar rutina por nombre"
              className="pl-9"
            />
          </div>
          <Button
            variant="outline"
            size="icon"
            aria-label="Filtros"
            className="relative shrink-0"
            onClick={() => setFiltersOpen(true)}
          >
            <SlidersHorizontal className="size-4" />
            {level && <span className="absolute -top-1 -right-1 size-2.5 rounded-full bg-primary" />}
          </Button>
        </div>
        <Button asChild className="ml-auto hidden md:inline-flex">
          <Link href="/entrenador/rutinas/nueva">
            <Plus />
            Nueva rutina
          </Link>
        </Button>
      </div>

      <MobileFab href="/entrenador/rutinas/nueva" icon={Plus} label="Nueva rutina" />

      <ResponsiveDialog open={filtersOpen} onOpenChange={setFiltersOpen} title="Filtros">
        <div className="flex flex-wrap gap-2">
          {LEVEL_OPTIONS.map((option) => (
            <Badge
              key={option.value}
              variant={level === option.value ? "default" : "outline"}
              className="h-7 cursor-pointer px-3"
              onClick={() => setLevel((l) => (l === option.value ? null : option.value))}
            >
              {option.label}
            </Badge>
          ))}
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="w-fit text-muted-foreground"
          disabled={!hasActiveFilters}
          onClick={() => {
            setQuery("");
            setLevel(null);
          }}
        >
          <FilterX /> Limpiar filtros
        </Button>
      </ResponsiveDialog>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-16 text-center text-muted-foreground">
          <ClipboardX className="size-8" />
          <p className="text-sm">
            {routines.length === 0
              ? "Todavía no tienes rutinas."
              : "Ninguna rutina coincide con la búsqueda o los filtros."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((routine) => (
            <Link key={routine.id} href={`/entrenador/rutinas/${routine.id}`} className="relative block">
              <Card className="h-full card-hover-glow transition-colors hover:border-primary/40">
                <CardContent className="flex h-full flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <div className="flex size-10 items-center justify-center rounded-full bg-primary/12 text-primary">
                      <Dumbbell className="size-[18px]" />
                    </div>
                    {routine.comments.length > 0 ? (
                      <button
                        type="button"
                        aria-label="Ver comentarios de clientes"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setCommentsRoutine(routine);
                        }}
                        className="relative -mr-1 -mt-1 flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                      >
                        <MessageSquare className="size-4.5" />
                        <span className="absolute -top-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
                          {routine.comments.length}
                        </span>
                      </button>
                    ) : null}
                  </div>
                  <div className="mt-auto">
                    <p className="truncate text-sm font-semibold">{routine.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {routine.routine_exercises[0]?.count ?? 0} ejercicios
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <Badge variant="secondary">{levelLabel(routine.level)}</Badge>
                      {routine.goal && (
                        <Badge variant="secondary">{goalLabel(routine.goal)}</Badge>
                      )}
                    </div>
                    {routine.avgRating !== null ? (
                      <div className="mt-1.5 flex items-center gap-1 text-xs font-medium text-muted-foreground">
                        <Star className="size-3.5 fill-amber-400 text-amber-400" />
                        <span className="tabular-nums text-foreground">{routine.avgRating.toFixed(1)}</span>
                        <span>({routine.ratingCount})</span>
                      </div>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <ResponsiveDialog
        open={commentsRoutine !== null}
        onOpenChange={(open) => !open && setCommentsRoutine(null)}
        title={commentsRoutine ? `Comentarios — ${commentsRoutine.name}` : ""}
      >
        <div className="flex max-h-[70vh] flex-col gap-3 overflow-y-auto">
          {commentsRoutine?.comments.map((c, i) => (
            <div key={i} className="rounded-lg border p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium">{c.clientName}</p>
                <p className="text-xs text-muted-foreground">{formatDate(c.sessionDate)}</p>
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                {c.difficultyLevel !== null ? <span>Dificultad {c.difficultyLevel}/10</span> : null}
                {c.ratingStars !== null ? (
                  <span className="flex items-center gap-0.5">
                    {Array.from({ length: 5 }).map((_, j) => (
                      <Star
                        key={j}
                        className={cn(
                          "size-3",
                          j < c.ratingStars! ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30",
                        )}
                      />
                    ))}
                  </span>
                ) : null}
                {c.caloriesBurned !== null ? (
                  <span className="flex items-center gap-1">
                    <Flame className="size-3.5" /> {c.caloriesBurned} kcal
                  </span>
                ) : null}
                {c.distanceKm !== null ? (
                  <span className="flex items-center gap-1">
                    <Route className="size-3.5" /> {c.distanceKm} km
                  </span>
                ) : null}
                {c.stepsCount !== null ? (
                  <span className="flex items-center gap-1">
                    <Footprints className="size-3.5" /> {c.stepsCount} pasos
                  </span>
                ) : null}
              </div>
              <p className="mt-2 text-sm">{c.comment}</p>
            </div>
          ))}
        </div>
      </ResponsiveDialog>
    </div>
  );
}
