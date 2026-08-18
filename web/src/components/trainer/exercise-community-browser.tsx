"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Plus,
  Check,
  Users2,
  SlidersHorizontal,
  FilterX,
  Dumbbell,
  ArrowUpDown,
} from "lucide-react";
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

type SortOption = "name_asc" | "added_first" | "not_added_first" | "date_desc";

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "name_asc", label: "Alfabético (A-Z)" },
  { value: "added_first", label: "Agregados primero" },
  { value: "not_added_first", label: "No agregados primero" },
  { value: "date_desc", label: "Más recientes primero" },
];

/**
 * Todo lo que cualquier entrenador (o Aretia, para los esenciales) ha
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
  const [sort, setSort] = React.useState<SortOption>("name_asc");
  const [filtersOpen, setFiltersOpen] = React.useState(false);
  const [sortOpen, setSortOpen] = React.useState(false);
  const [addingId, setAddingId] = React.useState<string | null>(null);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    const result = exercises.filter((exercise) => {
      if (muscleGroup && exercise.muscle_group !== muscleGroup) return false;
      if (equipment && exercise.equipment !== equipment) return false;
      if (q && !exercise.name.toLowerCase().includes(q)) return false;
      return true;
    });

    const sorted = [...result];
    switch (sort) {
      case "added_first":
        sorted.sort((a, b) =>
          a.in_my_library === b.in_my_library
            ? a.name.localeCompare(b.name)
            : a.in_my_library
              ? -1
              : 1,
        );
        break;
      case "not_added_first":
        sorted.sort((a, b) =>
          a.in_my_library === b.in_my_library
            ? a.name.localeCompare(b.name)
            : a.in_my_library
              ? 1
              : -1,
        );
        break;
      case "date_desc":
        sorted.sort((a, b) => b.created_at.localeCompare(a.created_at));
        break;
      default:
        sorted.sort((a, b) => a.name.localeCompare(b.name));
    }
    return sorted;
  }, [exercises, query, muscleGroup, equipment, sort]);

  const hasActiveFilters = muscleGroup !== null || equipment !== null;

  function clearFilters() {
    setMuscleGroup(null);
    setEquipment(null);
  }

  async function addToLibrary(exercise: CommunityExerciseOption) {
    setAddingId(exercise.id);
    const supabase = createClient();

    // Esencial de Aretia que antes quitaste de tu biblioteca: solo hay
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
      image_path: exercise.image_path,
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
            aria-label="Ordenar"
            className="shrink-0 md:hidden"
            onClick={() => setSortOpen(true)}
          >
            <ArrowUpDown className="size-4" />
          </Button>
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
          <Select value={sort} onValueChange={(v) => setSort(v as SortOption)}>
            <SelectTrigger className="w-[200px]">
              <ArrowUpDown className="size-3.5 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((option) => (
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
      </div>

      <ResponsiveDialog open={sortOpen} onOpenChange={setSortOpen} title="Ordenar por">
        <div className="flex flex-col gap-1">
          {SORT_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                setSort(option.value);
                setSortOpen(false);
              }}
              className={
                sort === option.value
                  ? "flex items-center justify-between rounded-lg bg-primary/10 px-3 py-2.5 text-left text-sm font-medium text-primary"
                  : "flex items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm hover:bg-accent"
              }
            >
              {option.label}
              {sort === option.value && <Check className="size-4" />}
            </button>
          ))}
        </div>
      </ResponsiveDialog>

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
          {filtered.map((exercise) => {
            const imageUrl = exercise.image_path
              ? createClient().storage.from("exercise-images").getPublicUrl(exercise.image_path)
                  .data.publicUrl
              : null;
            return (
            <Card key={exercise.id} className="h-full overflow-hidden gap-0 py-0">
              {imageUrl ? (
                <div className="h-28 w-full overflow-hidden bg-primary/12">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={imageUrl} alt="" className="h-full w-full object-cover" />
                </div>
              ) : null}
              <CardContent className="flex h-full flex-col gap-3 py-4">
                {!imageUrl && (
                  <div className="flex size-10 items-center justify-center rounded-full bg-foreground/[0.06] text-muted-foreground">
                    <Dumbbell className="size-[18px]" />
                  </div>
                )}
                <div className="mt-auto flex flex-col gap-1">
                  <p className="truncate text-sm font-semibold">{exercise.name}</p>
                  <p className="truncate text-[11px] text-muted-foreground">Por {exercise.creator_name}</p>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    <Badge variant="secondary">{muscleGroupLabel(exercise.muscle_group)}</Badge>
                    <Badge variant="secondary">{equipmentLabel(exercise.equipment)}</Badge>
                  </div>
                  {exercise.in_my_library ? (
                    <Badge
                      variant="secondary"
                      className="mt-1 w-fit gap-1 border-transparent bg-indigo-500/15 text-[10px] text-indigo-600 dark:text-indigo-400"
                    >
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
            );
          })}
        </div>
      )}
    </div>
  );
}
