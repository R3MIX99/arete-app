"use client";

import * as React from "react";
import Link from "next/link";
import { Search, Plus, Dumbbell, PlayCircle, SlidersHorizontal, FilterX } from "lucide-react";

import { muscleGroupLabel, equipmentLabel } from "@/lib/format";
import type { ExerciseSummary, MuscleGroup, Equipment } from "@/lib/types/exercise";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MobileFab } from "@/components/trainer/mobile-fab";

const MUSCLE_GROUPS: MuscleGroup[] = [
  "chest",
  "back",
  "shoulders",
  "arms",
  "legs",
  "core",
  "cardio",
  "full_body",
];

const EQUIPMENT: Equipment[] = [
  "bodyweight",
  "barbell",
  "dumbbell",
  "machine",
  "cable",
  "kettlebell",
  "resistance_band",
  "bench",
  "other",
];

export function ExercisesBrowser({ exercises }: { exercises: ExerciseSummary[] }) {
  const [query, setQuery] = React.useState("");
  const [muscleGroup, setMuscleGroup] = React.useState<MuscleGroup | null>(null);
  const [equipment, setEquipment] = React.useState<Equipment | null>(null);
  const [filtersOpen, setFiltersOpen] = React.useState(false);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return exercises.filter((exercise) => {
      if (muscleGroup && exercise.muscle_group !== muscleGroup) return false;
      if (equipment && exercise.equipment !== equipment) return false;
      if (q && !exercise.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [exercises, query, muscleGroup, equipment]);

  const hasActiveFilters = muscleGroup !== null || equipment !== null;

  function clearFilters() {
    setMuscleGroup(null);
    setEquipment(null);
  }

  return (
    <div className="flex w-full flex-col gap-6 p-4 pb-24 md:p-8">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-xs">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar ejercicio por nombre"
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
          {hasActiveFilters && (
            <span className="absolute -top-1 -right-1 size-2.5 rounded-full bg-primary" />
          )}
        </Button>
        <Button asChild className="ml-auto hidden md:inline-flex">
          <Link href="/entrenador/ejercicios/nuevo">
            <Plus />
            Nuevo ejercicio
          </Link>
        </Button>
      </div>

      <MobileFab
        href="/entrenador/ejercicios/nuevo"
        icon={Plus}
        label="Nuevo ejercicio"
      />

      <Dialog open={filtersOpen} onOpenChange={setFiltersOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Filtros</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <Select
              value={muscleGroup ?? "all"}
              onValueChange={(v) => setMuscleGroup(v === "all" ? null : (v as MuscleGroup))}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Grupo muscular" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los grupos</SelectItem>
                {MUSCLE_GROUPS.map((group) => (
                  <SelectItem key={group} value={group}>
                    {muscleGroupLabel(group)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={equipment ?? "all"}
              onValueChange={(v) => setEquipment(v === "all" ? null : (v as Equipment))}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Equipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todo el equipo</SelectItem>
                {EQUIPMENT.map((item) => (
                  <SelectItem key={item} value={item}>
                    {equipmentLabel(item)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              variant="ghost"
              size="sm"
              className="w-fit text-muted-foreground"
              disabled={!hasActiveFilters}
              onClick={clearFilters}
            >
              <FilterX /> Limpiar filtros
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-16 text-center text-muted-foreground">
          <Dumbbell className="size-8" />
          <p className="text-sm">
            {exercises.length === 0
              ? "Todavía no tienes ejercicios."
              : "Ningún ejercicio coincide con la búsqueda o los filtros."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((exercise) => {
            const hasVideo = Boolean(exercise.video_url);
            return (
              <Link key={exercise.id} href={`/entrenador/ejercicios/${exercise.id}`}>
                <Card className="h-full transition-colors hover:border-primary/40">
                  <CardContent className="flex h-full flex-col gap-3">
                    <div
                      className={
                        hasVideo
                          ? "flex size-10 items-center justify-center rounded-full bg-primary/12 text-primary"
                          : "flex size-10 items-center justify-center rounded-full bg-foreground/[0.06] text-muted-foreground"
                      }
                    >
                      {hasVideo ? (
                        <PlayCircle className="size-[18px]" />
                      ) : (
                        <Dumbbell className="size-[18px]" />
                      )}
                    </div>
                    <div className="mt-auto">
                      <p className="truncate text-sm font-semibold">{exercise.name}</p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        <Badge variant="secondary">
                          {muscleGroupLabel(exercise.muscle_group)}
                        </Badge>
                        <Badge variant="secondary">
                          {equipmentLabel(exercise.equipment)}
                        </Badge>
                      </div>
                    </div>
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
