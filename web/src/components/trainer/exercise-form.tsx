"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ImagePlus, Loader2, Trash, Dumbbell, X } from "lucide-react";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import { compressImage } from "@/lib/image-compress";
import { youtubeVideoId } from "@/lib/youtube";
import type { ExerciseDetail } from "@/lib/types/exercise";
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
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

const MUSCLE_GROUP_OPTIONS = [
  { value: "chest", label: "Pecho" },
  { value: "back", label: "Espalda" },
  { value: "shoulders", label: "Hombros" },
  { value: "arms", label: "Brazos" },
  { value: "legs", label: "Piernas" },
  { value: "core", label: "Core" },
  { value: "cardio", label: "Cardio" },
  { value: "full_body", label: "Cuerpo completo" },
];

const EQUIPMENT_OPTIONS = [
  { value: "bodyweight", label: "Peso corporal" },
  { value: "barbell", label: "Barra" },
  { value: "dumbbell", label: "Mancuernas" },
  { value: "machine", label: "Máquina" },
  { value: "cable", label: "Polea" },
  { value: "kettlebell", label: "Kettlebell" },
  { value: "resistance_band", label: "Banda de resistencia" },
  { value: "bench", label: "Banco" },
  { value: "other", label: "Otro" },
];

export function ExerciseForm({
  mode,
  exercise,
  trainerId,
}: {
  mode: "create" | "edit";
  exercise?: ExerciseDetail;
  trainerId: string;
}) {
  const router = useRouter();
  const [name, setName] = React.useState(exercise?.name ?? "");
  const [muscleGroup, setMuscleGroup] = React.useState(exercise?.muscle_group ?? "chest");
  const [equipment, setEquipment] = React.useState(exercise?.equipment ?? "bodyweight");
  const [description, setDescription] = React.useState(exercise?.description ?? "");
  const [videoUrl, setVideoUrl] = React.useState(exercise?.video_url ?? "");
  const [imagePath, setImagePath] = React.useState<string | null>(exercise?.image_path ?? null);
  const [uploadingImage, setUploadingImage] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const imageInputRef = React.useRef<HTMLInputElement>(null);
  const [deleting, setDeleting] = React.useState(false);
  const [hiding, setHiding] = React.useState(false);
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [hideConfirmOpen, setHideConfirmOpen] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const isOwned = !exercise || exercise.trainer_id === trainerId;
  // Esencial de Aretia: no es mío, pero sí lo puedo quitar de mi propia
  // biblioteca sin afectar a nadie más.
  const isEssential = mode === "edit" && !!exercise && exercise.trainer_id === null;

  const previewId = videoUrl ? youtubeVideoId(videoUrl) : null;
  const imageUrl = imagePath
    ? createClient().storage.from("exercise-images").getPublicUrl(imagePath).data.publicUrl
    : null;

  async function handleImageSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setUploadingImage(true);
    const supabase = createClient();
    const compressed = await compressImage(file);
    const path = `${trainerId}/exercise-${Date.now()}.jpg`;
    const { error: uploadError } = await supabase.storage
      .from("exercise-images")
      .upload(path, compressed, { upsert: true, contentType: "image/jpeg" });
    setUploadingImage(false);
    if (uploadError) {
      toast.error("No se pudo subir la imagen");
      return;
    }
    setImagePath(path);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    const supabase = createClient();

    const payload = {
      name,
      muscle_group: muscleGroup,
      equipment,
      description: description || null,
      video_url: videoUrl || null,
      image_path: imagePath,
    };

    if (mode === "edit" && exercise) {
      if (isOwned) {
        const { error: updateError } = await supabase
          .from("exercises")
          .update(payload)
          .eq("id", exercise.id);
        setSaving(false);
        if (updateError) {
          setError("No se pudieron guardar los cambios. Intenta de nuevo.");
          toast.error("No se pudieron guardar los cambios");
          return;
        }
        toast.success("Cambios guardados");
        router.push("/entrenador/ejercicios");
        router.refresh();
        return;
      }

      // No es tuyo (esencial de Aretia, o de otro entrenador): guardar
      // crea tu propia copia personalizada en vez de tocar el
      // compartido — a los demás no les cambia nada. Pero esa copia no
      // se queda huérfana: se reemplaza el original por la copia en
      // TODO lo tuyo (tus rutinas, y el historial/evolución de tus
      // clientes para ese ejercicio) para que no queden dos versiones
      // sueltas del mismo ejercicio.
      const { data: forkRow, error: forkError } = await supabase
        .from("exercises")
        .insert({ ...payload, trainer_id: trainerId, forked_from: exercise.id })
        .select("id")
        .single();
      if (forkError || !forkRow) {
        setSaving(false);
        setError("No se pudo guardar tu copia personalizada. Intenta de nuevo.");
        toast.error("No se pudo guardar tu copia personalizada");
        return;
      }

      const { error: replaceError } = await supabase.rpc("replace_exercise_everywhere", {
        p_original_exercise_id: exercise.id,
        p_new_exercise_id: forkRow.id,
      });
      if (replaceError) {
        // La copia ya se creó y se puede usar; solo avisamos que el
        // reemplazo automático en rutinas/historial no se pudo hacer.
        console.error(replaceError);
        toast.error(
          "Se creó tu copia, pero no se pudo reemplazar automáticamente en tus rutinas e historial.",
        );
      }

      // Si el original era esencial de Aretia, se quita de tu biblioteca
      // para que ya no aparezcan dos versiones del mismo ejercicio — tu
      // copia editada la reemplaza. No afecta a otros entrenadores.
      if (!exercise.trainer_id) {
        await supabase
          .from("trainer_hidden_exercises")
          .upsert(
            { trainer_id: trainerId, exercise_id: exercise.id },
            { onConflict: "trainer_id,exercise_id", ignoreDuplicates: true },
          );
      }

      setSaving(false);
      toast.success(
        replaceError
          ? "Se creó tu copia personalizada de este ejercicio"
          : "Se reemplazó este ejercicio por tu copia personalizada en tus rutinas e historial",
      );
      router.push("/entrenador/ejercicios");
      router.refresh();
      return;
    }

    const { error: insertError } = await supabase
      .from("exercises")
      .insert({ ...payload, trainer_id: trainerId });
    setSaving(false);
    if (insertError) {
      setError("No se pudo crear el ejercicio. Intenta de nuevo.");
      toast.error("No se pudo crear el ejercicio");
      return;
    }
    toast.success("Ejercicio creado");
    router.push("/entrenador/ejercicios");
    router.refresh();
  }

  async function handleDelete() {
    if (!exercise) return;
    setDeleting(true);
    const supabase = createClient();
    const { error: deleteError } = await supabase
      .from("exercises")
      .delete()
      .eq("id", exercise.id);
    if (deleteError) {
      setError(
        "No se pudo eliminar — puede estar usado en alguna rutina existente.",
      );
      toast.error("No se pudo eliminar", {
        description: "Puede estar usado en alguna rutina existente.",
      });
      setDeleting(false);
      setConfirmOpen(false);
      return;
    }
    toast.success("Ejercicio eliminado");
    router.push("/entrenador/ejercicios");
    router.refresh();
  }

  async function handleHide() {
    if (!exercise) return;
    setHiding(true);
    const supabase = createClient();
    const { error: hideError } = await supabase
      .from("trainer_hidden_exercises")
      .insert({ trainer_id: trainerId, exercise_id: exercise.id });
    setHiding(false);
    setHideConfirmOpen(false);
    if (hideError) {
      toast.error("No se pudo quitar de tu biblioteca");
      return;
    }
    toast.success("Se quitó de tu biblioteca");
    router.push("/entrenador/ejercicios");
    router.refresh();
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-4 md:p-8">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" className="w-fit" asChild>
          <Link href="/entrenador/ejercicios">
            <ArrowLeft /> Volver a la biblioteca
          </Link>
        </Button>
        {mode === "edit" && isOwned && (
          <Button
            variant="ghost"
            size="sm"
            aria-label="Eliminar"
            className="text-destructive hover:text-destructive"
            onClick={() => setConfirmOpen(true)}
          >
            <Trash />
            <span className="hidden md:inline">Eliminar</span>
          </Button>
        )}
        {mode === "edit" && isEssential && (
          <Button
            variant="ghost"
            size="sm"
            aria-label="Quitar de mi biblioteca"
            className="text-destructive hover:text-destructive"
            onClick={() => setHideConfirmOpen(true)}
          >
            <Trash />
            <span className="hidden md:inline">Quitar de mi biblioteca</span>
          </Button>
        )}
      </div>

      {mode === "edit" && !isOwned && (
        <p className="rounded-lg bg-primary/8 px-3 py-2 text-sm text-muted-foreground">
          Este ejercicio es de {exercise?.trainer_id ? "otro entrenador" : "Aretia"}. Al guardar se
          creará tu propia copia personalizada — el original no cambia para nadie más.
        </p>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <div className="flex items-center gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary/12 text-primary">
            <Dumbbell className="size-5" />
          </div>
          <Input
            id="name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nombre del ejercicio"
            className="h-auto border-none px-0 text-2xl font-bold shadow-none focus-visible:ring-0 md:text-3xl"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:items-start">
          <Card>
            <CardHeader>
              <CardTitle>Detalles</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label>Imagen (opcional)</Label>
                <div className="flex items-center gap-3">
                  <div className="relative flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-primary/12 text-primary">
                    {imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={imageUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <Dumbbell className="size-8" />
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
                    {imageUrl ? "Cambiar imagen" : "Subir imagen"}
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="muscle_group">Grupo muscular</Label>
                  <Select
                    value={muscleGroup}
                    onValueChange={(v) => setMuscleGroup(v as typeof muscleGroup)}
                  >
                    <SelectTrigger id="muscle_group">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MUSCLE_GROUP_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="equipment">Equipo</Label>
                  <Select
                    value={equipment}
                    onValueChange={(v) => setEquipment(v as typeof equipment)}
                  >
                    <SelectTrigger id="equipment">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {EQUIPMENT_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="description">Descripción (opcional)</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={6}
                  placeholder="Cómo ejecutarlo, técnica, cues..."
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Video de YouTube (opcional)</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <Input
                id="video_url"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
              />
              {videoUrl && !previewId && (
                <p className="text-xs text-muted-foreground">
                  Ese enlace no parece ser de YouTube — se guarda igual, pero no se
                  puede mostrar la previsualización.
                </p>
              )}
              {previewId ? (
                <div className="aspect-video w-full overflow-hidden rounded-lg border border-border">
                  <iframe
                    className="size-full"
                    src={`https://www.youtube.com/embed/${previewId}`}
                    title="Previsualización del video"
                    allowFullScreen
                  />
                </div>
              ) : (
                <div className="flex aspect-video w-full items-center justify-center rounded-lg border border-dashed border-border text-sm text-muted-foreground">
                  Sin video
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}

        <Button type="submit" disabled={saving} className="w-fit">
          {saving ? <Loader2 className="animate-spin" /> : null}
          {mode === "create" ? "Crear ejercicio" : "Guardar cambios"}
        </Button>
      </form>

      {exercise && (
        <ConfirmDialog
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          title={`¿Eliminar "${exercise.name}"?`}
          description="Esta acción no se puede deshacer. Si está usado en alguna rutina, no se podrá eliminar hasta quitarlo de ahí."
          loading={deleting}
          onConfirm={handleDelete}
        />
      )}

      {exercise && (
        <ConfirmDialog
          open={hideConfirmOpen}
          onOpenChange={setHideConfirmOpen}
          title={`¿Quitar "${exercise.name}" de tu biblioteca?`}
          description="Deja de aparecer en tu biblioteca, pero sigue disponible en Comunidad para el resto de entrenadores y lo puedes volver a agregar cuando quieras."
          loading={hiding}
          onConfirm={handleHide}
        />
      )}
    </div>
  );
}
