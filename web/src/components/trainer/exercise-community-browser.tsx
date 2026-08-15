"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Search, Plus, Check, Users2, SlidersHorizontal, FilterX, Dumbbell } from "lucide-react";
import { toast } from "sonner";

import { muscleGroupLabel, equipmentLabel } from "@/lib/format";
import { createClient } from "@/lib/supabase/client";
import type { CommunityExerciseOption, MuscleGroup, Equipment } from "@/lib/types/exercise";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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

/**
 * Todo lo que cualquier entrenador (o Areté, para los esenciales) ha
 * creado — a diferencia de "Mi biblioteca", que solo muestra lo que
 * este entrenador ya puede usar. Desde aquí se copia un ejercicio a tu
 * propia biblioteca con "Agregar".
 */
export function ExerciseCommunityBrowser({
  exercises,
  trainerId,
}: {
  exercises: CommunityExerciseOption[];
  trainerId: string;
}) {
  const router = useRouter();
  const [query, setQuery] = React.useState("");
  const [muscleGroup, setMuscleGroup] = React.useState<MuscleGroup | null>(null);
  const [equipment, setEquipment] = React.useState<Equipment | null>(null);
  const [filtersOpen, setFiltersOpen] = React.useState(false);
  const [addingId, setAddingId] = React.useState<string | null>(null);

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

  async function addToLibrary(exercise: CommunityExerciseOption) {
    setAddingId(exercise.id);
    const supabase = createClient();

    // Esencial de Areté que antes quitaste de tu biblioteca: solo hay
    // que deshacer el "ocultar", no crear una copia — el ejercicio
    // esencial sigue siendo el mismo para todos.
    if (!exercise.trainer_id) {
      const { error } = await supabase
        .from("trainer_hidden_exercises")
        .delete()
        .eq("trainer_id", trainerId)
        .eq("exercise_id", exercise.id);
      setAddingId(null);
      if (error) {
        toast.error("No se pudo agregar a tu biblioteca");
        return;
      }
      toast.success(`"${exercise.name}" agregado a tu biblioteca`);
      router.refresh();
      return;
    }

    const { error } = await supabase.from("exercises").insert({
      forked_from: exercise.id,
      name: exercise.name,
      muscle_group: exercise.muscle_group,
      equipment: exercise.equipment,
      description: exercise.description,
      video_url: exercise.video_url,
    });
    setAddingId(null);
    if (error) {
      toast.error("No se pudo agregar a tu biblioteca");
      return;
    }
    toast.success(`"${exercise.name}" agregado a tu biblioteca`);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-6 pt-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-2 sm:max-w-xs">
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
            variant="outline"
            size="icon"
            aria-label="Filtros"
            className="relative shrink-0 md:hidden"
            onClick={() => setFiltersOpen(true)}
          >
            <SlidersHorizontal className="size-4" />
            {hasActiveFilters && <span className="absolute -top-1 -right-1 size-2.5 rounded-full bg-primary" />}
          </Button>
        </div>

        <div className="hidden items-center gap-2 md:flex">
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
      </div>

      <ResponsiveDialog open={filtersOpen} onOpenChange={setFiltersOpen} title="Filtros">
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
          <Users2 className="size-8" />
          <p className="text-sm">Ningún ejercicio coincide con la búsqueda o los filtros.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((exercise) => (
            <Card key={exercise.id} className="h-full">
              <CardContent className="flex h-full flex-col gap-3">
                <div className="flex size-10 items-center justify-center rounded-full bg-foreground/[0.06] text-muted-foreground">
                  <Dumbbell className="size-[18px]" />
                </div>
                <div className="mt-auto flex flex-col gap-1">
                  <p className="truncate text-sm font-semibold">{exercise.name}</p>
                  <p className="truncate text-[11px] text-muted-foreground">Por {exercise.creator_name}</p>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    <Badge variant="secondary">{muscleGroupLabel(exercise.muscle_group)}</Badge>
                    <Badge variant="secondary">{equipmentLabel(exercise.equipment)}</Badge>
                  </div>
                  {exercise.in_my_library ? (
                    <Badge variant="secondary" className="mt-1 w-fit gap-1 text-[10px]">
                      <Check className="size-3" /> En tu biblioteca
                    </Badge>
                  ) : (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="mt-1 w-fit"
                      disabled={addingId === exercise.id}
                      onClick={() => addToLibrary(exercise)}
                    >
                      <Plus className="size-3.5" /> Agregar
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
