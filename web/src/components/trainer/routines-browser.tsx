"use client";

import * as React from "react";
import Link from "next/link";
import { Search, Plus, ClipboardX, FilterX, Dumbbell } from "lucide-react";

import { levelLabel, goalLabel } from "@/lib/format";
import type { RoutineSummary } from "@/lib/types/routine";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

const LEVEL_OPTIONS = [
  { value: "beginner", label: "Principiante" },
  { value: "intermediate", label: "Intermedio" },
  { value: "advanced", label: "Avanzado" },
];

export function RoutinesBrowser({ routines }: { routines: RoutineSummary[] }) {
  const [query, setQuery] = React.useState("");
  const [level, setLevel] = React.useState<string | null>(null);

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
    <div className="flex w-full flex-col gap-6 p-4 md:p-8">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-xs">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar rutina por nombre"
            className="pl-9"
          />
        </div>
        <Button asChild className="ml-auto">
          <Link href="/entrenador/rutinas/nueva">
            <Plus />
            Nueva rutina
          </Link>
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
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
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground"
          disabled={!hasActiveFilters}
          onClick={() => {
            setQuery("");
            setLevel(null);
          }}
        >
          <FilterX /> Limpiar filtros
        </Button>
      </div>

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
            <Link key={routine.id} href={`/entrenador/rutinas/${routine.id}`}>
              <Card className="h-full transition-colors hover:border-primary/40">
                <CardContent className="flex h-full flex-col gap-3">
                  <div className="flex size-10 items-center justify-center rounded-full bg-primary/12 text-primary">
                    <Dumbbell className="size-[18px]" />
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
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
