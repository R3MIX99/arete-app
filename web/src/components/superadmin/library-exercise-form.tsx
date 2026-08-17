"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Dumbbell, ImagePlus, Loader2, Trash, X } from "lucide-react";
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

/**
 * Crear/editar un ejercicio de la biblioteca de Areté (trainer_id
 * null). A diferencia del formulario del entrenador, aquí no hay
 * lógica de "copiar" — el superadmin edita el original directamente, y
 * ese cambio lo ve cualquier entrenador que lo tenga en su biblioteca.
 */
export function LibraryExerciseForm({
  mode,
  exercise,
}: {
  mode: "create" | "edit";
  exercise?: ExerciseDetail;
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
  const [deleting, setDeleting] = React.useState(false);
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const imageInputRef = React.useRef<HTMLInputElement>(null);

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
    const path = `global/exercise-${Date.now()}.jpg`;
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
      router.push("/superadmin/biblioteca");
      router.refresh();
      return;
    }

    const { error: insertError } = await supabase
      .from("exercises")
      .insert({ ...payload, trainer_id: null });
    setSaving(false);
    if (insertError) {
      setError("No se pudo crear el ejercicio. Intenta de nuevo.");
      toast.error("No se pudo crear el ejercicio");
      return;
    }
    toast.success("Ejercicio creado");
    router.push("/superadmin/biblioteca");
    router.refresh();
  }

  async function handleDelete() {
    if (!exercise) return;
    setDeleting(true);
    const supabase = createClient();
    const { error: deleteError } = await supabase.from("exercises").delete().eq("id", exercise.id);
    if (deleteError) {
      toast.error("No se pudo eliminar", {
        description: "Puede estar usado en la biblioteca de algún entrenador.",
      });
      setDeleting(false);
      setConfirmOpen(false);
      return;
    }
    toast.success("Ejercicio eliminado");
    router.push("/superadmin/biblioteca");
    router.refresh();
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-4 md:p-8">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" className="w-fit" asChild>
          <Link href="/superadmin/biblioteca">
            <ArrowLeft /> Volver a la biblioteca
          </Link>
        </Button>
        {mode === "edit" && (
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
      </div>

      <p className="rounded-lg bg-primary/8 px-3 py-2 text-sm text-muted-foreground">
        Esto edita el catálogo global de Areté — lo ve cualquier entrenador que lo tenga en su
        biblioteca.
      </p>

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
                  Ese enlace no parece ser de YouTube — se guarda igual, pero no se puede mostrar
                  la previsualización.
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
          description="Esta acción no se puede deshacer. Si algún entrenador lo tiene usado en una rutina, no se podrá eliminar hasta que lo quite de ahí."
          loading={deleting}
          onConfirm={handleDelete}
        />
      )}
    </div>
  );
}
