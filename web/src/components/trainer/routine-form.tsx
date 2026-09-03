"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowUp,
  ArrowDown,
  Loader2,
  Plus,
  Trash2,
  Dumbbell,
  ImagePlus,
  Trash,
  Sparkles,
  PlayCircle,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import { logActivity, startTiming } from "@/lib/log-activity";
import { compressImage } from "@/lib/image-compress";
import { youtubeVideoId } from "@/lib/youtube";
import type {
  ExerciseOption,
  RoutineDetail,
  RoutineExerciseInput,
  RoutineGoal,
} from "@/lib/types/routine";
import type { AiRoutineResult } from "@/lib/types/ai";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ExercisePickerDialog } from "@/components/trainer/exercise-picker-dialog";
import { GenerateRoutineDialog } from "@/components/trainer/generate-routine-dialog";
import { RoutineAiScoreCard } from "@/components/trainer/routine-ai-score-card";

const LEVEL_OPTIONS = [
  { value: "beginner", label: "Principiante" },
  { value: "intermediate", label: "Intermedio" },
  { value: "advanced", label: "Avanzado" },
];

const GOAL_OPTIONS = [
  { value: "lose_weight", label: "Perder peso" },
  { value: "gain_muscle", label: "Ganar músculo" },
  { value: "maintenance", label: "Mantenimiento" },
  { value: "performance", label: "Rendimiento" },
];

function isCardioGroup(muscleGroup: string) {
  return muscleGroup === "cardio";
}

function defaultSet(
  setNumber: number,
  isCardio: boolean,
  previous?: RoutineExerciseInput["sets"][number],
): RoutineExerciseInput["sets"][number] {
  if (isCardio) {
    return {
      set_number: setNumber,
      target_reps_min: null,
      target_reps_max: null,
      rest_seconds: null,
      target_minutes: previous?.target_minutes ?? 20,
      target_level: previous?.target_level ?? 5,
    };
  }
  return {
    set_number: setNumber,
    target_reps_min: previous?.target_reps_min ?? 8,
    target_reps_max: previous?.target_reps_max ?? 12,
    rest_seconds: previous?.rest_seconds ?? 60,
    target_minutes: null,
    target_level: null,
  };
}

export function RoutineForm({
  mode,
  routine,
  initialExercises,
  exerciseCatalog,
  trainerId,
}: {
  mode: "create" | "edit";
  routine?: RoutineDetail;
  initialExercises?: RoutineExerciseInput[];
  exerciseCatalog: ExerciseOption[];
  trainerId: string;
}) {
  const router = useRouter();
  const [name, setName] = React.useState(routine?.name ?? "");
  const [description, setDescription] = React.useState(routine?.description ?? "");
  const [level, setLevel] = React.useState(routine?.level ?? "beginner");
  const [goal, setGoal] = React.useState(routine?.goal ?? "");
  const [imagePath, setImagePath] = React.useState<string | null>(routine?.image_path ?? null);
  const [uploadingImage, setUploadingImage] = React.useState(false);
  const imageInputRef = React.useRef<HTMLInputElement>(null);
  const [exercises, setExercises] = React.useState<RoutineExerciseInput[]>(
    initialExercises ?? [],
  );
  const [pickerOpen, setPickerOpen] = React.useState(false);
  const [aiOpen, setAiOpen] = React.useState(false);
  // Para diferenciar en el log si la rutina se armó con IA o a mano —
  // se prende en cuanto se usa el generador aunque después se edite el
  // resultado a mano, porque el punto de partida sí fue IA.
  const [usedAi, setUsedAi] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const imageUrl = imagePath
    ? createClient().storage.from("routine-images").getPublicUrl(imagePath).data.publicUrl
    : null;

  async function handleImageSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setUploadingImage(true);
    const supabase = createClient();
    // Más ancha que las de alimentos: la tarjeta del cliente la usa
    // como foto de portada, no como miniatura.
    const compressed = await compressImage(file, { maxDimension: 900 });
    const path = `${trainerId}/routine-${Date.now()}.jpg`;
    const { error: uploadError } = await supabase.storage
      .from("routine-images")
      .upload(path, compressed, { upsert: true, contentType: "image/jpeg" });
    setUploadingImage(false);
    if (uploadError) {
      toast.error("No se pudo subir la imagen");
      return;
    }
    setImagePath(path);
  }

  function handleAiGenerated(result: AiRoutineResult) {
    setUsedAi(true);
    if (name.trim() === "") setName(result.name);
    if (description.trim() === "") setDescription(result.description);

    const unmatched: string[] = [];
    const nextExercises: RoutineExerciseInput[] = [];
    for (const aiExercise of result.exercises) {
      // Prioriza el id que sugirió la IA (viene de tu propio catálogo);
      // si no vino o no existe, intenta encontrar el mismo ejercicio por
      // nombre antes de darlo por no encontrado.
      const matched =
        (aiExercise.exercise_id &&
          exerciseCatalog.find((e) => e.id === aiExercise.exercise_id)) ||
        exerciseCatalog.find(
          (e) => e.name.trim().toLowerCase() === aiExercise.exercise_name.trim().toLowerCase(),
        );

      if (!matched) {
        unmatched.push(aiExercise.exercise_name);
        continue;
      }

      nextExercises.push({
        exercise_id: matched.id,
        exercise_name: matched.name,
        exercise_muscle_group: matched.muscle_group,
        exercise_video_url: matched.video_url,
        order_index: nextExercises.length,
        notes: aiExercise.notes || "",
        sets: aiExercise.sets.map((s) => ({
          set_number: s.set_number,
          target_reps_min: s.target_reps_min ?? null,
          target_reps_max: s.target_reps_max ?? null,
          rest_seconds: s.rest_seconds ?? null,
          target_minutes: s.target_minutes ?? null,
          target_level: s.target_level ?? null,
        })),
      });
    }

    setExercises(nextExercises);
    toast.success("Rutina generada — revísala antes de guardar");
    if (unmatched.length > 0) {
      toast.info(
        `La IA sugirió estos ejercicios pero no están en tu biblioteca todavía, así que no se agregaron: ${unmatched.join(", ")}`,
        { duration: 8000 },
      );
    }
  }

  function addExercise(exercise: ExerciseOption) {
    setExercises((prev) => [
      ...prev,
      {
        exercise_id: exercise.id,
        exercise_name: exercise.name,
        exercise_muscle_group: exercise.muscle_group,
        exercise_video_url: exercise.video_url,
        order_index: prev.length,
        notes: "",
        sets: [defaultSet(1, isCardioGroup(exercise.muscle_group))],
      },
    ]);
  }

  function removeExercise(index: number) {
    setExercises((prev) => prev.filter((_, i) => i !== index));
  }

  function moveExercise(index: number, direction: -1 | 1) {
    setExercises((prev) => {
      const target = index + direction;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function updateExerciseNotes(index: number, notes: string) {
    setExercises((prev) =>
      prev.map((ex, i) => (i === index ? { ...ex, notes } : ex)),
    );
  }

  function addSet(exerciseIndex: number) {
    setExercises((prev) =>
      prev.map((ex, i) => {
        if (i !== exerciseIndex) return ex;
        const last = ex.sets[ex.sets.length - 1];
        return {
          ...ex,
          sets: [
            ...ex.sets,
            defaultSet(ex.sets.length + 1, isCardioGroup(ex.exercise_muscle_group), last),
          ],
        };
      }),
    );
  }

  function removeSet(exerciseIndex: number, setIndex: number) {
    setExercises((prev) =>
      prev.map((ex, i) => {
        if (i !== exerciseIndex) return ex;
        if (ex.sets.length <= 1) return ex;
        return {
          ...ex,
          sets: ex.sets
            .filter((_, si) => si !== setIndex)
            .map((s, si) => ({ ...s, set_number: si + 1 })),
        };
      }),
    );
  }

  function updateSet(
    exerciseIndex: number,
    setIndex: number,
    patch: Partial<RoutineExerciseInput["sets"][number]>,
  ) {
    setExercises((prev) =>
      prev.map((ex, i) => {
        if (i !== exerciseIndex) return ex;
        return {
          ...ex,
          sets: ex.sets.map((s, si) => (si === setIndex ? { ...s, ...patch } : s)),
        };
      }),
    );
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (exercises.length === 0) {
      setError("Agrega al menos un ejercicio a la rutina.");
      return;
    }
    setSaving(true);
    setError(null);
    const startedAt = startTiming();

    const supabase = createClient();

    const routinePayload = {
      trainer_id: trainerId,
      name,
      description: description || null,
      level,
      goal: goal || null,
      image_path: imagePath,
    };

    let routineId = routine?.id;

    if (mode === "create") {
      const { data, error: insertError } = await supabase
        .from("routines")
        .insert(routinePayload)
        .select("id")
        .single();
      if (insertError || !data) {
        logActivity({
          action: "trainer.routine_create_failed",
          category: "trainer",
          severity: "error",
          message: `No se pudo crear la rutina "${name}"`,
          startedAt,
          context: { name, usedAi, reason: insertError?.message },
        });
        setError("No se pudo crear la rutina. Intenta de nuevo.");
        toast.error("No se pudo crear la rutina");
        setSaving(false);
        return;
      }
      routineId = data.id;
    } else {
      const { error: updateError } = await supabase
        .from("routines")
        .update(routinePayload)
        .eq("id", routineId!);
      if (updateError) {
        logActivity({
          action: "trainer.routine_edit_failed",
          category: "trainer",
          severity: "error",
          message: `No se pudieron guardar los cambios de "${name}"`,
          targetType: "routine",
          targetId: routineId,
          targetLabel: name,
          startedAt,
          context: { reason: updateError.message },
        });
        setError("No se pudieron guardar los cambios. Intenta de nuevo.");
        toast.error("No se pudieron guardar los cambios");
        setSaving(false);
        return;
      }
      // Se borran y recrean los ejercicios/series — más simple y confiable
      // que diferenciar cambios fila por fila. La cascada borra
      // routine_exercise_sets, pero client_set_logs ya NO cuelga de esa
      // cascada (ver migración client_set_logs_survive_routine_edits):
      // el historial y la evolución que el cliente ya registró se
      // quedan intactos aunque se reconstruya la rutina desde cero.
      await supabase.from("routine_exercises").delete().eq("routine_id", routineId!);
    }

    for (let i = 0; i < exercises.length; i++) {
      const exercise = exercises[i];
      const { data: exerciseRow, error: exerciseError } = await supabase
        .from("routine_exercises")
        .insert({
          routine_id: routineId!,
          exercise_id: exercise.exercise_id,
          order_index: i,
          notes: exercise.notes || null,
        })
        .select("id")
        .single();

      if (exerciseError || !exerciseRow) {
        setError("No se pudo guardar uno de los ejercicios. Intenta de nuevo.");
        toast.error("No se pudo guardar uno de los ejercicios");
        setSaving(false);
        return;
      }

      const setsPayload = exercise.sets.map((s) => ({
        routine_exercise_id: exerciseRow.id,
        set_number: s.set_number,
        target_reps_min: s.target_reps_min,
        target_reps_max: s.target_reps_max,
        rest_seconds: s.rest_seconds,
        target_minutes: s.target_minutes,
        target_level: s.target_level,
      }));
      const { error: setsError } = await supabase
        .from("routine_exercise_sets")
        .insert(setsPayload);
      if (setsError) {
        setError("No se pudieron guardar las series. Intenta de nuevo.");
        toast.error("No se pudieron guardar las series");
        setSaving(false);
        return;
      }
    }

    logActivity({
      action: mode === "create" ? "trainer.routine_created" : "trainer.routine_edited",
      category: "trainer",
      severity: "success",
      message:
        mode === "create"
          ? `Creó la rutina "${name}"${usedAi ? " (con IA)" : ""}`
          : `Editó la rutina "${name}"`,
      targetType: "routine",
      targetId: routineId,
      targetLabel: name,
      startedAt,
      context: { usedAi, exerciseCount: exercises.length },
    });

    toast.success(mode === "create" ? "Rutina creada" : "Cambios guardados");
    router.push("/entrenador/rutinas");
    router.refresh();
  }

  async function handleDelete() {
    if (!routine) return;
    const startedAt = startTiming();
    setDeleting(true);
    const supabase = createClient();
    const { error: deleteError } = await supabase
      .from("routines")
      .delete()
      .eq("id", routine.id);
    if (deleteError) {
      logActivity({
        action: "trainer.routine_delete_failed",
        category: "trainer",
        severity: "error",
        message: `No se pudo eliminar la rutina "${routine.name}"`,
        targetType: "routine",
        targetId: routine.id,
        targetLabel: routine.name,
        startedAt,
        context: { reason: deleteError.message },
      });
      setError("No se pudo eliminar la rutina.");
      toast.error("No se pudo eliminar la rutina");
      setDeleting(false);
      setConfirmOpen(false);
      return;
    }
    logActivity({
      action: "trainer.routine_deleted",
      category: "trainer",
      severity: "warning",
      message: `Eliminó la rutina "${routine.name}"`,
      targetType: "routine",
      targetId: routine.id,
      targetLabel: routine.name,
      startedAt,
    });
    toast.success("Rutina eliminada");
    router.push("/entrenador/rutinas");
    router.refresh();
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 p-4 md:p-8">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" className="w-fit" asChild>
          <Link href="/entrenador/rutinas">
            <ArrowLeft /> Volver a rutinas
          </Link>
        </Button>
        {mode === "edit" && (
          <Button
            variant="ghost"
            size="sm"
            aria-label="Eliminar rutina"
            className="text-destructive hover:text-destructive"
            onClick={() => setConfirmOpen(true)}
          >
            <Trash />
            <span className="hidden md:inline">Eliminar rutina</span>
          </Button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Card>
          <CardHeader>
            <CardTitle>{mode === "create" ? "Nueva rutina" : "Editar rutina"}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label>Foto de portada (opcional)</Label>
              <div className="flex items-center gap-3">
                <div className="relative h-20 w-32 shrink-0 overflow-hidden rounded-lg bg-primary/12">
                  {imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={imageUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-primary">
                      <Dumbbell className="size-7" />
                    </div>
                  )}
                  {imagePath && (
                    <button
                      type="button"
                      aria-label="Quitar imagen"
                      onClick={() => setImagePath(null)}
                      className="absolute top-1 right-1 flex size-5 items-center justify-center rounded-full bg-black/60 text-white"
                    >
                      <X className="size-3" />
                    </button>
                  )}
                </div>
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageSelected}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={uploadingImage}
                  onClick={() => imageInputRef.current?.click()}
                >
                  {uploadingImage ? <Loader2 className="animate-spin" /> : <ImagePlus />}
                  {imageUrl ? "Cambiar foto" : "Subir foto"}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Es la foto que ve tu cliente en la tarjeta de esta rutina.
              </p>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="name">Nombre</Label>
              <Input
                id="name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej. Piernas y glúteo"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="description">Descripción (opcional)</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="level">Nivel</Label>
                <Select value={level} onValueChange={(v) => setLevel(v as typeof level)}>
                  <SelectTrigger id="level">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LEVEL_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="goal">Objetivo (opcional)</Label>
                <Select value={goal} onValueChange={setGoal}>
                  <SelectTrigger id="goal">
                    <SelectValue placeholder="Sin definir" />
                  </SelectTrigger>
                  <SelectContent>
                    {GOAL_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* En teléfono el título y los dos botones no caben en un mismo
            renglón, así que los botones bajan debajo del título y se
            reparten el ancho. Desde sm vuelven a su derecha. */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            Ejercicios
          </h2>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="flex-1 sm:flex-none"
              onClick={() => setAiOpen(true)}
            >
              <Sparkles /> Generar con IA
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="flex-1 sm:flex-none"
              onClick={() => setPickerOpen(true)}
            >
              <Plus /> Agregar ejercicio
            </Button>
          </div>
        </div>

        {exercises.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-2 py-10 text-center text-muted-foreground">
              <Dumbbell className="size-6" />
              <p className="text-sm">Agrega ejercicios de tu biblioteca para armar la rutina.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="flex flex-col gap-3">
            {exercises.map((exercise, exerciseIndex) => {
              const videoId = exercise.exercise_video_url
                ? youtubeVideoId(exercise.exercise_video_url)
                : null;
              return (
              <Card key={`${exercise.exercise_id}-${exerciseIndex}`}>
                <CardContent className="flex flex-col gap-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <div
                        className={
                          videoId
                            ? "flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/12 text-primary"
                            : "flex size-8 shrink-0 items-center justify-center rounded-full bg-foreground/[0.06] text-muted-foreground"
                        }
                      >
                        {videoId ? <PlayCircle className="size-4" /> : <Dumbbell className="size-4" />}
                      </div>
                      <p className="min-w-0 truncate text-sm font-semibold">{exercise.exercise_name}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label="Mover arriba"
                        disabled={exerciseIndex === 0}
                        onClick={() => moveExercise(exerciseIndex, -1)}
                      >
                        <ArrowUp />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label="Mover abajo"
                        disabled={exerciseIndex === exercises.length - 1}
                        onClick={() => moveExercise(exerciseIndex, 1)}
                      >
                        <ArrowDown />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label="Quitar ejercicio"
                        className="text-destructive hover:text-destructive"
                        onClick={() => removeExercise(exerciseIndex)}
                      >
                        <Trash2 />
                      </Button>
                    </div>
                  </div>

                  {videoId && (
                    <div className="aspect-video w-full overflow-hidden rounded-lg border border-border">
                      <iframe
                        className="size-full"
                        src={`https://www.youtube.com/embed/${videoId}`}
                        title={exercise.exercise_name}
                        allowFullScreen
                      />
                    </div>
                  )}

                  <Input
                    value={exercise.notes}
                    onChange={(e) => updateExerciseNotes(exerciseIndex, e.target.value)}
                    placeholder="Notas para este ejercicio (opcional)"
                  />

                  <Separator />

                  {isCardioGroup(exercise.exercise_muscle_group) ? (
                    <div className="flex flex-col gap-2">
                      <div className="grid grid-cols-[2rem_1fr_1fr_2rem] gap-2 text-[11px] font-medium text-muted-foreground uppercase">
                        <span>Serie</span>
                        <span>Minutos</span>
                        <span>Nivel (1-10)</span>
                        <span />
                      </div>
                      {exercise.sets.map((set, setIndex) => (
                        <div
                          key={setIndex}
                          className="grid grid-cols-[2rem_1fr_1fr_2rem] items-center gap-2"
                        >
                          <span className="text-sm font-medium tabular-nums">
                            {set.set_number}
                          </span>
                          <Input
                            type="number"
                            min={1}
                            value={set.target_minutes ?? ""}
                            onChange={(e) =>
                              updateSet(exerciseIndex, setIndex, {
                                target_minutes:
                                  e.target.value === "" ? null : Number(e.target.value),
                              })
                            }
                          />
                          <Input
                            type="number"
                            min={1}
                            max={10}
                            value={set.target_level ?? ""}
                            onChange={(e) =>
                              updateSet(exerciseIndex, setIndex, {
                                target_level:
                                  e.target.value === "" ? null : Number(e.target.value),
                              })
                            }
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label="Quitar serie"
                            disabled={exercise.sets.length <= 1}
                            onClick={() => removeSet(exerciseIndex, setIndex)}
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      ))}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="w-fit"
                        onClick={() => addSet(exerciseIndex)}
                      >
                        <Plus /> Agregar serie
                      </Button>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      <div className="grid grid-cols-[2rem_1fr_1fr_1fr_2rem] gap-2 text-[11px] font-medium text-muted-foreground uppercase">
                        <span>Serie</span>
                        <span>Reps min</span>
                        <span>Reps max</span>
                        <span>Descanso (s)</span>
                        <span />
                      </div>
                      {exercise.sets.map((set, setIndex) => (
                        <div
                          key={setIndex}
                          className="grid grid-cols-[2rem_1fr_1fr_1fr_2rem] items-center gap-2"
                        >
                          <span className="text-sm font-medium tabular-nums">
                            {set.set_number}
                          </span>
                          <Input
                            type="number"
                            min={1}
                            value={set.target_reps_min ?? ""}
                            onChange={(e) =>
                              updateSet(exerciseIndex, setIndex, {
                                target_reps_min:
                                  e.target.value === "" ? null : Number(e.target.value),
                              })
                            }
                          />
                          <Input
                            type="number"
                            min={1}
                            value={set.target_reps_max ?? ""}
                            onChange={(e) =>
                              updateSet(exerciseIndex, setIndex, {
                                target_reps_max:
                                  e.target.value === "" ? null : Number(e.target.value),
                              })
                            }
                          />
                          <Input
                            type="number"
                            min={0}
                            step={5}
                            value={set.rest_seconds ?? ""}
                            onChange={(e) =>
                              updateSet(exerciseIndex, setIndex, {
                                rest_seconds:
                                  e.target.value === "" ? null : Number(e.target.value),
                              })
                            }
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label="Quitar serie"
                            disabled={exercise.sets.length <= 1}
                            onClick={() => removeSet(exerciseIndex, setIndex)}
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      ))}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="w-fit"
                        onClick={() => addSet(exerciseIndex)}
                      >
                        <Plus /> Agregar serie
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
              );
            })}
          </div>
        )}

        {routine && (
          <RoutineAiScoreCard
            routineId={routine.id}
            name={name}
            level={level}
            goal={(goal || null) as RoutineGoal | null}
            exercises={exercises}
            initialScore={routine.ai_score}
            initialReasoning={routine.ai_score_summary}
            initialAnalyzedAt={routine.ai_analyzed_at}
          />
        )}

        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}

        <Button type="submit" disabled={saving} className="mt-1 w-fit">
          {saving ? <Loader2 className="animate-spin" /> : null}
          {mode === "create" ? "Crear rutina" : "Guardar cambios"}
        </Button>
      </form>

      <ExercisePickerDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        exercises={exerciseCatalog}
        onPick={addExercise}
      />

      <GenerateRoutineDialog
        key={aiOpen ? "ai-open" : "ai-closed"}
        open={aiOpen}
        onOpenChange={setAiOpen}
        exerciseCatalog={exerciseCatalog}
        onGenerated={handleAiGenerated}
      />

      {routine && (
        <ConfirmDialog
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          title={`¿Eliminar la rutina "${routine.name}"?`}
          description="Esta acción no se puede deshacer."
          loading={deleting}
          onConfirm={handleDelete}
        />
      )}
    </div>
  );
}
