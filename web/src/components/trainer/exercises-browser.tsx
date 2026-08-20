"use client";

import * as React from "react";
import Link from "next/link";
import { Search, Plus, Dumbbell, PlayCircle, SlidersHorizontal, FilterX } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { muscleGroupLabel, equipmentLabel } from "@/lib/format";
import { youtubeThumbnails } from "@/lib/youtube";
import type { ExerciseSummary, MuscleGroup, Equipment } from "@/lib/types/exercise";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ThumbnailImage } from "@/components/client/thumbnail-image";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
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

type OriginFilter = "all" | "community" | "created";

const ORIGIN_OPTIONS: { value: OriginFilter; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "community", label: "Comunidad" },
  { value: "created", label: "Creados" },
];

export function ExercisesBrowser({
  exercises,
  trainerId,
}: {
  exercises: ExerciseSummary[];
  trainerId: string;
}) {
  const [query, setQuery] = React.useState("");
  const [muscleGroup, setMuscleGroup] = React.useState<MuscleGroup | null>(null);
  const [equipment, setEquipment] = React.useState<Equipment | null>(null);
  const [origin, setOrigin] = React.useState<OriginFilter>("all");
  const [filtersOpen, setFiltersOpen] = React.useState(false);

  // "Creados" = lo que yo escribí desde cero. "Comunidad" = esenciales
  // de Aretia o copias que hice de otro entrenador — no nacieron conmigo.
  function matchesOrigin(exercise: ExerciseSummary) {
    if (origin === "all") return true;
    const wasCreatedByMe = exercise.trainer_id === trainerId && !exercise.forked_from;
    return origin === "created" ? wasCreatedByMe : !wasCreatedByMe;
  }

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return exercises.filter((exercise) => {
      if (muscleGroup && exercise.muscle_group !== muscleGroup) return false;
      if (equipment && exercise.equipment !== equipment) return false;
      if (!matchesOrigin(exercise)) return false;
      if (q && !exercise.name.toLowerCase().includes(q)) return false;
      return true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exercises, query, muscleGroup, equipment, origin, trainerId]);

  const hasActiveFilters = muscleGroup !== null || equipment !== null || origin !== "all";

  function clearFilters() {
    setMuscleGroup(null);
    setEquipment(null);
    setOrigin("all");
  }

  return (
    <div className="flex w-full flex-col gap-6 pt-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-2 sm:max-w-xs md:hidden">
          <div className="relative min-w-0 flex-1">
            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar ejercicio por nombre"
              className="pl-9"
            />
          </div>
          {/* Teléfono: ícono que abre un drawer con los filtros. */}
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
        </div>

        <div className="relative hidden w-full max-w-xs md:block">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar ejercicio por nombre"
            className="pl-9"
          />
        </div>

        {/* Computadora: selectores de filtro visibles en la misma barra. */}
        <div className="hidden items-center gap-2 md:flex">
          <Select value={origin} onValueChange={(v) => setOrigin(v as OriginFilter)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ORIGIN_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={muscleGroup ?? "all"}
            onValueChange={(v) => setMuscleGroup(v === "all" ? null : (v as MuscleGroup))}
          >
            <SelectTrigger className="w-[180px]">
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
            <SelectTrigger className="w-[160px]">
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
            className="text-muted-foreground"
            disabled={!hasActiveFilters}
            onClick={clearFilters}
          >
            <FilterX /> Limpiar filtros
          </Button>
        </div>

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

      <ResponsiveDialog open={filtersOpen} onOpenChange={setFiltersOpen} title="Filtros">
        <Select value={origin} onValueChange={(v) => setOrigin(v as OriginFilter)}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ORIGIN_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

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
      </ResponsiveDialog>

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
        // Grid en vez de una sola columna: en pantallas grandes las
        // tarjetas quedaban estiradas de punta a punta, ilegibles. Con
        // un ancho mínimo por tarjeta caben ~3 por fila en desktop y
        // se acomodan solas en pantallas más chicas.
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((exercise) => {
            const hasVideo = Boolean(exercise.video_url);
            const uploadedImageUrl = exercise.image_path
              ? createClient().storage.from("exercise-images").getPublicUrl(exercise.image_path)
                  .data.publicUrl
              : null;
            // Sin foto propia, la miniatura del video es mejor que un
            // ícono genérico — mismo criterio que ya se usa en las
            // tarjetas de ejercicio del panel de cliente.
            const thumbs = uploadedImageUrl ? null : youtubeThumbnails(exercise.video_url);
            return (
              <Link key={exercise.id} href={`/entrenador/ejercicios/${exercise.id}`}>
                {/* Horizontal en vez de imagen arriba/texto abajo: la
                    imagen es un cuadro grande a la izquierda (mismo
                    tratamiento que la vista previa de rutina), el texto
                    a la derecha — se ve mejor que una franja angosta
                    arriba de la tarjeta. */}
                <Card className="card-hover-glow gap-0 overflow-hidden py-0 transition-colors hover:border-primary/40">
                  <CardContent className="flex items-center gap-3 p-1.5 pr-3">
                    <div className="relative size-24 shrink-0 overflow-hidden rounded-xl bg-primary/12">
                      {uploadedImageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={uploadedImageUrl}
                          alt=""
                          className="absolute inset-0 h-full w-full object-cover"
                        />
                      ) : thumbs ? (
                        <ThumbnailImage
                          src={thumbs.primary}
                          fallbackSrc={thumbs.fallback}
                          className="absolute inset-0 h-full w-full object-cover"
                        />
                      ) : (
                        <div
                          className={
                            hasVideo
                              ? "absolute inset-0 flex items-center justify-center text-primary"
                              : "absolute inset-0 flex items-center justify-center text-muted-foreground"
                          }
                        >
                          {hasVideo ? (
                            <PlayCircle className="size-6" />
                          ) : (
                            <Dumbbell className="size-6" />
                          )}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1 py-1">
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
