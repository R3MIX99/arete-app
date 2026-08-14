"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ImagePlus,
  Loader2,
  Pencil,
  Plus,
  Trash,
  Trash2,
  Utensils,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import { compressImage } from "@/lib/image-compress";
import { mealTypeLabel, householdMeasureFor } from "@/lib/format";
import { mealTypeIcon } from "@/lib/food-icons";
import type { DishIngredientInput, FoodOption, MealType } from "@/lib/types/nutrition";
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
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { FoodPickerDialog } from "@/components/trainer/food-picker-dialog";
import { QuantityDialog } from "@/components/trainer/quantity-dialog";

const MEAL_TYPE_OPTIONS: { value: MealType; label: string }[] = [
  { value: "breakfast", label: "Desayuno" },
  { value: "lunch", label: "Almuerzo" },
  { value: "dinner", label: "Cena" },
  { value: "snack", label: "Snack" },
];

interface DishInfo {
  id: string;
  name: string;
  description: string | null;
  meal_type: MealType;
  image_path: string | null;
}

export function DishBuilder({
  trainerId,
  dish,
  initialIngredients,
  foodCatalog,
}: {
  trainerId: string;
  dish: DishInfo;
  initialIngredients: DishIngredientInput[];
  foodCatalog: FoodOption[];
}) {
  const router = useRouter();
  const [ingredients, setIngredients] = React.useState(initialIngredients);
  const [pickerOpen, setPickerOpen] = React.useState(false);
  const [pendingFood, setPendingFood] = React.useState<FoodOption | null>(null);
  const [adding, setAdding] = React.useState(false);
  const [removingId, setRemovingId] = React.useState<string | null>(null);
  const [editOpen, setEditOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);

  const totals = React.useMemo(() => {
    return ingredients.reduce(
      (acc, ing) => {
        const factor = ing.quantity_grams / 100;
        return {
          calories: acc.calories + ing.calories_per_100g * factor,
          protein: acc.protein + ing.protein_per_100g * factor,
          carbs: acc.carbs + ing.carbs_per_100g * factor,
          fat: acc.fat + ing.fat_per_100g * factor,
        };
      },
      { calories: 0, protein: 0, carbs: 0, fat: 0 },
    );
  }, [ingredients]);

  async function handleAddIngredient(grams: number) {
    if (!pendingFood) return;
    setAdding(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("dish_ingredients")
      .insert({
        dish_id: dish.id,
        food_id: pendingFood.id,
        quantity_grams: grams,
        order_index: ingredients.length,
      })
      .select("id")
      .single();
    setAdding(false);
    if (error || !data) {
      toast.error("No se pudo agregar el ingrediente");
      return;
    }
    setIngredients((prev) => [
      ...prev,
      {
        id: data.id,
        food_id: pendingFood.id,
        food_name: pendingFood.name,
        quantity_grams: grams,
        order_index: prev.length,
        calories_per_100g: pendingFood.calories_per_100g,
        protein_per_100g: pendingFood.protein_per_100g,
        carbs_per_100g: pendingFood.carbs_per_100g,
        fat_per_100g: pendingFood.fat_per_100g,
        household_unit_name: pendingFood.household_unit_name,
        household_unit_grams: pendingFood.household_unit_grams,
      },
    ]);
    toast.success("Ingrediente agregado");
    setPendingFood(null);
  }

  async function handleRemoveIngredient(ingredientId: string | undefined) {
    if (!ingredientId) return;
    setRemovingId(ingredientId);
    const supabase = createClient();
    const { error } = await supabase
      .from("dish_ingredients")
      .delete()
      .eq("id", ingredientId);
    setRemovingId(null);
    if (error) {
      toast.error("No se pudo quitar el ingrediente");
      return;
    }
    setIngredients((prev) => prev.filter((ing) => ing.id !== ingredientId));
    toast.success("Ingrediente quitado");
  }

  async function handleDelete() {
    setDeleting(true);
    const supabase = createClient();
    const { error } = await supabase.from("dishes").delete().eq("id", dish.id);
    if (error) {
      toast.error("No se pudo eliminar el platillo. Puede estar usado en un plan.");
      setDeleting(false);
      setDeleteOpen(false);
      return;
    }
    toast.success("Platillo eliminado");
    router.push("/entrenador/nutricion");
    router.refresh();
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 p-4 md:p-8">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" className="w-fit" asChild>
          <Link href="/entrenador/nutricion">
            <ArrowLeft /> Volver a nutrición
          </Link>
        </Button>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={() => setEditOpen(true)}>
            <Pencil /> Editar información
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash /> Eliminar
          </Button>
        </div>
      </div>

      <Card className="gap-0 overflow-hidden py-0">
        <DishImage dish={dish} />
        <CardHeader className="pt-5">
          <CardTitle>{dish.name}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-1.5">
            <Badge variant="secondary">{mealTypeLabel(dish.meal_type)}</Badge>
          </div>
          {dish.description && (
            <p className="text-sm text-muted-foreground">{dish.description}</p>
          )}
          <div className="grid grid-cols-4 gap-2 text-center">
            <MacroStat label="Kcal" value={Math.round(totals.calories)} />
            <MacroStat label="Prot" value={`${Math.round(totals.protein)}g`} />
            <MacroStat label="Carb" value={`${Math.round(totals.carbs)}g`} />
            <MacroStat label="Grasa" value={`${Math.round(totals.fat)}g`} />
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          Ingredientes
        </h2>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setPickerOpen(true)}
        >
          <Plus /> Agregar ingrediente
        </Button>
      </div>

      {ingredients.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-10 text-center text-muted-foreground">
            <Utensils className="size-6" />
            <p className="text-sm">Agrega alimentos de tu catálogo para armar el platillo.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-2">
          {ingredients.map((ing) => {
            const measure = householdMeasureFor(
              ing.quantity_grams,
              ing.household_unit_name,
              ing.household_unit_grams,
            );
            const kcal = Math.round((ing.calories_per_100g * ing.quantity_grams) / 100);
            return (
              <Card key={ing.id ?? ing.food_id}>
                <CardContent className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{ing.food_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {Math.round(ing.quantity_grams)} g
                      {measure ? ` · ${measure}` : ""} · {kcal} kcal
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="Quitar ingrediente"
                    className="shrink-0 text-destructive hover:text-destructive"
                    disabled={removingId === ing.id}
                    onClick={() => handleRemoveIngredient(ing.id)}
                  >
                    {removingId === ing.id ? (
                      <Loader2 className="animate-spin" />
                    ) : (
                      <Trash2 />
                    )}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <FoodPickerDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        foods={foodCatalog}
        onPick={(food) => setPendingFood(food)}
      />

      <QuantityDialog
        open={pendingFood !== null}
        onOpenChange={(open) => !open && setPendingFood(null)}
        itemName={pendingFood?.name ?? ""}
        onConfirm={handleAddIngredient}
      />

      {adding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20">
          <Loader2 className="size-6 animate-spin text-white" />
        </div>
      )}

      <EditDishInfoDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        dish={dish}
        trainerId={trainerId}
      />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={`¿Eliminar el platillo "${dish.name}"?`}
        description="Esta acción no se puede deshacer."
        loading={deleting}
        onConfirm={handleDelete}
      />
    </div>
  );
}

function MacroStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg bg-foreground/[0.04] px-2 py-2">
      <p className="text-sm font-semibold tabular-nums">{value}</p>
      <p className="text-[10px] text-muted-foreground uppercase">{label}</p>
    </div>
  );
}

function DishImage({ dish }: { dish: DishInfo }) {
  const Icon = mealTypeIcon(dish.meal_type);
  const imageUrl = dish.image_path
    ? createClient().storage.from("food-images").getPublicUrl(dish.image_path).data.publicUrl
    : null;
  return (
    <div className="relative h-40 w-full bg-primary/12">
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageUrl} alt={dish.name} className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-primary">
          <Icon className="size-10" />
        </div>
      )}
    </div>
  );
}

function EditDishInfoDialog({
  open,
  onOpenChange,
  dish,
  trainerId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dish: DishInfo;
  trainerId: string;
}) {
  const router = useRouter();
  const [name, setName] = React.useState(dish.name);
  const [description, setDescription] = React.useState(dish.description ?? "");
  const [mealType, setMealType] = React.useState<MealType>(dish.meal_type);
  const [imagePath, setImagePath] = React.useState<string | null>(dish.image_path);
  const [uploadingImage, setUploadingImage] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const imageInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (open) {
      setName(dish.name);
      setDescription(dish.description ?? "");
      setMealType(dish.meal_type);
      setImagePath(dish.image_path);
    }
  }, [open, dish]);

  const MealIcon = mealTypeIcon(mealType);
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
    const path = `${trainerId}/dish-${Date.now()}.jpg`;
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
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("dishes")
      .update({
        name,
        description: description || null,
        meal_type: mealType,
        image_path: imagePath,
      })
      .eq("id", dish.id);
    setSaving(false);
    if (error) {
      toast.error("No se pudieron guardar los cambios");
      return;
    }
    toast.success("Cambios guardados");
    onOpenChange(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar información</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>Imagen (opcional)</Label>
            <div className="flex items-center gap-3">
              <div className="relative flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-primary/12 text-primary">
                {imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={imageUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <MealIcon className="size-6" />
                )}
                {imagePath && (
                  <button
                    type="button"
                    aria-label="Quitar imagen"
                    onClick={() => setImagePath(null)}
                    className="absolute top-1 right-1 flex size-4 items-center justify-center rounded-full bg-black/60 text-white"
                  >
                    <X className="size-2.5" />
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
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit_name">Nombre</Label>
            <Input id="edit_name" required value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit_meal_type">Tipo de comida</Label>
            <Select value={mealType} onValueChange={(v) => setMealType(v as MealType)}>
              <SelectTrigger id="edit_meal_type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MEAL_TYPE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit_description">Descripción (opcional)</Label>
            <Textarea
              id="edit_description"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <Button type="submit" disabled={saving} className="w-fit">
            {saving ? <Loader2 className="animate-spin" /> : null}
            Guardar cambios
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
