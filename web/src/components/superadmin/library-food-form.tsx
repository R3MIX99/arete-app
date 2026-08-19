"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ImagePlus, Loader2, Trash, X } from "lucide-react";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import { compressImage } from "@/lib/image-compress";
import { foodCategoryIcon } from "@/lib/food-icons";
import type { FoodCategory, FoodOption } from "@/lib/types/nutrition";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

/** Crear/editar un alimento del catálogo global de Aretia (trainer_id
 * null) — mismo formulario que el del entrenador, sin la rama de
 * "copiar": el superadmin siempre edita el original directamente. */
export function LibraryFoodForm({
  mode = "create",
  food,
  categories,
}: {
  mode?: "create" | "edit";
  food?: FoodOption;
  categories: FoodCategory[];
}) {
  const router = useRouter();
  const [name, setName] = React.useState(food?.name ?? "");
  const [categoryId, setCategoryId] = React.useState(food?.food_category_id ?? "");
  const [calories, setCalories] = React.useState<number | "">(food?.calories_per_100g ?? 0);
  const [protein, setProtein] = React.useState<number | "">(food?.protein_per_100g ?? 0);
  const [carbs, setCarbs] = React.useState<number | "">(food?.carbs_per_100g ?? 0);
  const [fat, setFat] = React.useState<number | "">(food?.fat_per_100g ?? 0);
  const [unitName, setUnitName] = React.useState(food?.household_unit_name ?? "");
  const [unitGrams, setUnitGrams] = React.useState<number | "">(food?.household_unit_grams ?? "");
  const [imagePath, setImagePath] = React.useState<string | null>(food?.image_path ?? null);
  const [uploadingImage, setUploadingImage] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const imageInputRef = React.useRef<HTMLInputElement>(null);

  const categorySlug = categories.find((c) => c.id === categoryId)?.slug ?? null;
  const imageUrl = imagePath
    ? createClient().storage.from("food-images").getPublicUrl(imagePath).data.publicUrl
    : null;

  async function handleImageSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setUploadingImage(true);
    const supabase = createClient();
    const compressed = await compressImage(file);
    const path = `global/food-${Date.now()}.jpg`;

    const { error: uploadError } = await supabase.storage
      .from("food-images")
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
    if (!categoryId) {
      setError("Elige una categoría.");
      return;
    }
    const hasUnit = unitName.trim() !== "" && unitGrams !== "";
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const payload = {
      food_category_id: categoryId,
      name,
      calories_per_100g: calories === "" ? 0 : calories,
      protein_per_100g: protein === "" ? 0 : protein,
      carbs_per_100g: carbs === "" ? 0 : carbs,
      fat_per_100g: fat === "" ? 0 : fat,
      household_unit_name: hasUnit ? unitName : null,
      household_unit_grams: hasUnit ? Number(unitGrams) : null,
      image_path: imagePath,
    };

    if (mode === "edit" && food) {
      const { error: updateError } = await supabase.from("foods").update(payload).eq("id", food.id);
      setLoading(false);
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

    const { error: insertError } = await supabase.from("foods").insert({ ...payload, trainer_id: null });
    setLoading(false);
    if (insertError) {
      setError("No se pudo crear el alimento. Intenta de nuevo.");
      toast.error("No se pudo crear el alimento");
      return;
    }

    toast.success("Alimento creado");
    router.push("/superadmin/biblioteca");
    router.refresh();
  }

  async function handleDelete() {
    if (!food) return;
    setDeleting(true);
    const supabase = createClient();
    const { error: deleteError } = await supabase.from("foods").delete().eq("id", food.id);
    if (deleteError) {
      toast.error("No se pudo eliminar. Puede estar usado en un platillo o plan.");
      setDeleting(false);
      setDeleteOpen(false);
      return;
    }
    toast.success("Alimento eliminado");
    router.push("/superadmin/biblioteca");
    router.refresh();
  }

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-4 p-4 md:p-8">
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
            onClick={() => setDeleteOpen(true)}
          >
            <Trash /> <span className="hidden md:inline">Eliminar</span>
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{mode === "create" ? "Nuevo alimento" : "Editar alimento"}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4 rounded-lg bg-primary/8 px-3 py-2 text-sm text-muted-foreground">
            Esto edita el catálogo global de Aretia — lo ve cualquier entrenador que lo tenga en su
            catálogo.
          </p>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label>Imagen (opcional)</Label>
              <div className="flex items-center gap-3">
                <div className="relative flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-primary/12 text-primary">
                  {imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={imageUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    // `foodCategoryIcon` elige el ícono dinámicamente; se invoca con
                    // React.createElement (no como tag JSX <Icon/>) porque el ícono
                    // no es una referencia estable entre renders y usarlo como tag
                    // dispara "Cannot create components during render".
                    React.createElement(foodCategoryIcon(categorySlug), { className: "size-8" })
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
              <p className="text-xs text-muted-foreground">
                Si no subes una imagen, se muestra el ícono de la categoría.
              </p>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="name">Nombre</Label>
              <Input
                id="name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej. Pechuga de pollo"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="category">Categoría</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger id="category">
                  <SelectValue placeholder="Elige una categoría" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              Por cada 100 g
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="calories">Calorías</Label>
                <Input
                  id="calories"
                  type="number"
                  min={0}
                  step="0.1"
                  required
                  value={calories}
                  onChange={(e) => setCalories(e.target.value === "" ? "" : Number(e.target.value))}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="protein">Proteína (g)</Label>
                <Input
                  id="protein"
                  type="number"
                  min={0}
                  step="0.1"
                  required
                  value={protein}
                  onChange={(e) => setProtein(e.target.value === "" ? "" : Number(e.target.value))}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="carbs">Carbohidratos (g)</Label>
                <Input
                  id="carbs"
                  type="number"
                  min={0}
                  step="0.1"
                  required
                  value={carbs}
                  onChange={(e) => setCarbs(e.target.value === "" ? "" : Number(e.target.value))}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="fat">Grasa (g)</Label>
                <Input
                  id="fat"
                  type="number"
                  min={0}
                  step="0.1"
                  required
                  value={fat}
                  onChange={(e) => setFat(e.target.value === "" ? "" : Number(e.target.value))}
                />
              </div>
            </div>

            <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              Medida casera (opcional)
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="unit_name">Nombre</Label>
                <Input
                  id="unit_name"
                  value={unitName}
                  onChange={(e) => setUnitName(e.target.value)}
                  placeholder="Ej. huevo mediano"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="unit_grams">Equivale a (g)</Label>
                <Input
                  id="unit_grams"
                  type="number"
                  min={0}
                  step="0.1"
                  value={unitGrams}
                  onChange={(e) => setUnitGrams(e.target.value === "" ? "" : Number(e.target.value))}
                />
              </div>
            </div>

            {error ? (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            ) : null}

            <Button type="submit" disabled={loading} className="mt-1 w-fit">
              {loading ? <Loader2 className="animate-spin" /> : null}
              {mode === "create" ? "Crear alimento" : "Guardar cambios"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {food && (
        <ConfirmDialog
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
          title={`¿Eliminar "${food.name}"?`}
          description="Esta acción no se puede deshacer. Si el alimento está usado en un platillo o plan, no se podrá eliminar."
          loading={deleting}
          onConfirm={handleDelete}
        />
      )}
    </div>
  );
}
