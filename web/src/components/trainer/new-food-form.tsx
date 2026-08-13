"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import type { FoodCategory } from "@/lib/types/nutrition";
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

export function NewFoodForm({
  trainerId,
  categories,
}: {
  trainerId: string;
  categories: FoodCategory[];
}) {
  const router = useRouter();
  const [name, setName] = React.useState("");
  const [categoryId, setCategoryId] = React.useState("");
  const [calories, setCalories] = React.useState(0);
  const [protein, setProtein] = React.useState(0);
  const [carbs, setCarbs] = React.useState(0);
  const [fat, setFat] = React.useState(0);
  const [unitName, setUnitName] = React.useState("");
  const [unitGrams, setUnitGrams] = React.useState<number | "">("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

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
    const { error: insertError } = await supabase.from("foods").insert({
      trainer_id: trainerId,
      food_category_id: categoryId,
      name,
      calories_per_100g: calories,
      protein_per_100g: protein,
      carbs_per_100g: carbs,
      fat_per_100g: fat,
      household_unit_name: hasUnit ? unitName : null,
      household_unit_grams: hasUnit ? Number(unitGrams) : null,
    });

    if (insertError) {
      setError("No se pudo crear el alimento. Intenta de nuevo.");
      toast.error("No se pudo crear el alimento");
      setLoading(false);
      return;
    }

    toast.success("Alimento creado");
    router.push("/entrenador/nutricion");
    router.refresh();
  }

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-4 p-4 md:p-8">
      <Button variant="ghost" size="sm" className="w-fit" asChild>
        <Link href="/entrenador/nutricion">
          <ArrowLeft /> Volver a nutrición
        </Link>
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>Nuevo alimento</CardTitle>
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
                  onChange={(e) => setCalories(Number(e.target.value))}
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
                  onChange={(e) => setProtein(Number(e.target.value))}
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
                  onChange={(e) => setCarbs(Number(e.target.value))}
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
                  onChange={(e) => setFat(Number(e.target.value))}
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
                  onChange={(e) =>
                    setUnitGrams(e.target.value === "" ? "" : Number(e.target.value))
                  }
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
              Crear alimento
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
