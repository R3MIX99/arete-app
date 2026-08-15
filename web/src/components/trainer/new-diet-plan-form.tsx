"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function NewDietPlanForm({ trainerId }: { trainerId: string }) {
  const router = useRouter();
  const [name, setName] = React.useState("");
  const [goalLabel, setGoalLabel] = React.useState("");
  const [dailyCalorieTarget, setDailyCalorieTarget] = React.useState<number | "">("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { data, error: insertError } = await supabase
      .from("diet_plans")
      .insert({
        trainer_id: trainerId,
        name,
        goal_label: goalLabel || null,
        daily_calorie_target: dailyCalorieTarget === "" ? null : Number(dailyCalorieTarget),
      })
      .select("id")
      .single();

    if (insertError || !data) {
      setError("No se pudo crear el plan. Intenta de nuevo.");
      toast.error("No se pudo crear el plan");
      setLoading(false);
      return;
    }

    // Arranca con los 4 bloques de siempre — se pueden renombrar,
    // quitar o agregar más después.
    await supabase.from("diet_plan_blocks").insert([
      { diet_plan_id: data.id, name: "Desayuno", order_index: 0 },
      { diet_plan_id: data.id, name: "Almuerzo", order_index: 1 },
      { diet_plan_id: data.id, name: "Cena", order_index: 2 },
      { diet_plan_id: data.id, name: "Snack", order_index: 3 },
    ]);

    toast.success("Plan creado");
    router.push(`/entrenador/nutricion/planes/${data.id}`);
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
          <CardTitle>Nuevo plan nutricional</CardTitle>
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
                placeholder="Ej. Déficit calórico 1800 kcal"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="goal_label">Objetivo (opcional)</Label>
              <Input
                id="goal_label"
                value={goalLabel}
                onChange={(e) => setGoalLabel(e.target.value)}
                placeholder="Ej. Déficit calórico alto en proteína"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="daily_calorie_target">Meta calórica diaria (opcional)</Label>
              <Input
                id="daily_calorie_target"
                type="number"
                min={1}
                value={dailyCalorieTarget}
                onChange={(e) =>
                  setDailyCalorieTarget(e.target.value === "" ? "" : Number(e.target.value))
                }
                placeholder="Ej. 1800"
              />
            </div>

            {error ? (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            ) : null}

            <Button type="submit" disabled={loading} className="mt-1 w-fit">
              {loading ? <Loader2 className="animate-spin" /> : null}
              Crear plan
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
