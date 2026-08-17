"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import type { MealType } from "@/lib/types/nutrition";
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

const MEAL_TYPE_OPTIONS: { value: MealType; label: string }[] = [
  { value: "breakfast", label: "Desayuno" },
  { value: "lunch", label: "Almuerzo" },
  { value: "dinner", label: "Cena" },
  { value: "snack", label: "Snack" },
];

/** Paso 1 de crear un platillo del catálogo global: nombre, tipo de
 * comida y descripción. Los ingredientes y la imagen se agregan
 * después en el builder (mismo flujo de dos pasos que el entrenador). */
export function LibraryDishForm() {
  const router = useRouter();
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [mealType, setMealType] = React.useState<MealType>("breakfast");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { data, error: insertError } = await supabase
      .from("dishes")
      .insert({
        trainer_id: null,
        name,
        description: description || null,
        meal_type: mealType,
      })
      .select("id")
      .single();

    if (insertError || !data) {
      setError("No se pudo crear el platillo. Intenta de nuevo.");
      toast.error("No se pudo crear el platillo");
      setLoading(false);
      return;
    }

    toast.success("Platillo creado");
    router.push(`/superadmin/biblioteca/platillos/${data.id}`);
    router.refresh();
  }

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-4 p-4 md:p-8">
      <Button variant="ghost" size="sm" className="w-fit" asChild>
        <Link href="/superadmin/biblioteca">
          <ArrowLeft /> Volver a la biblioteca
        </Link>
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>Nuevo platillo</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="name">Nombre</Label>
              <Input
                id="name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej. Huevos con verduras"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="meal_type">Tipo de comida</Label>
              <Select value={mealType} onValueChange={(v) => setMealType(v as MealType)}>
                <SelectTrigger id="meal_type">
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
              <Label htmlFor="description">Descripción (opcional)</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
              />
            </div>

            {error ? (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            ) : null}

            <Button type="submit" disabled={loading} className="mt-1 w-fit">
              {loading ? <Loader2 className="animate-spin" /> : null}
              Crear y agregar ingredientes
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
