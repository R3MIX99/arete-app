"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import { logActivity, startTiming } from "@/lib/log-activity";
import type { AiDietResult } from "@/lib/types/ai";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GenerateDietDialog } from "@/components/trainer/generate-diet-dialog";

export function NewDietPlanForm({ trainerId }: { trainerId: string }) {
  const router = useRouter();
  const [name, setName] = React.useState("");
  const [goalLabel, setGoalLabel] = React.useState("");
  const [dailyCalorieTarget, setDailyCalorieTarget] = React.useState<number | "">("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [aiOpen, setAiOpen] = React.useState(false);

  async function createPlan(
    supabase: ReturnType<typeof createClient>,
    payload: { name: string; goal_label: string | null; daily_calorie_target: number | null },
  ) {
    const { data, error: insertError } = await supabase
      .from("diet_plans")
      .insert({ trainer_id: trainerId, ...payload })
      .select("id")
      .single();
    if (insertError || !data) return null;
    return data.id as string;
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const startedAt = startTiming();

    const supabase = createClient();
    const planId = await createPlan(supabase, {
      name,
      goal_label: goalLabel || null,
      daily_calorie_target: dailyCalorieTarget === "" ? null : Number(dailyCalorieTarget),
    });

    if (!planId) {
      logActivity({
        action: "trainer.diet_plan_create_failed",
        category: "trainer",
        severity: "error",
        message: `No se pudo crear el plan nutricional "${name}"`,
        startedAt,
        context: { name, usedAi: false },
      });
      setError("No se pudo crear el plan. Intenta de nuevo.");
      toast.error("No se pudo crear el plan");
      setLoading(false);
      return;
    }

    // Arranca con los 4 bloques de siempre — se pueden renombrar,
    // quitar o agregar más después.
    await supabase.from("diet_plan_blocks").insert([
      { diet_plan_id: planId, name: "Desayuno", order_index: 0 },
      { diet_plan_id: planId, name: "Almuerzo", order_index: 1 },
      { diet_plan_id: planId, name: "Cena", order_index: 2 },
      { diet_plan_id: planId, name: "Snack", order_index: 3 },
    ]);

    logActivity({
      action: "trainer.diet_plan_created",
      category: "trainer",
      severity: "success",
      message: `Creó el plan nutricional "${name}"`,
      targetType: "diet_plan",
      targetId: planId,
      targetLabel: name,
      startedAt,
      context: { usedAi: false },
    });

    toast.success("Plan creado");
    router.push(`/entrenador/nutricion/planes/${planId}`);
    router.refresh();
  }

  async function handleAiGenerated(result: AiDietResult) {
    setLoading(true);
    setError(null);
    const startedAt = startTiming();
    const supabase = createClient();

    const planName = name || result.name;
    const planId = await createPlan(supabase, {
      name: planName,
      goal_label: goalLabel || null,
      daily_calorie_target: dailyCalorieTarget === "" ? null : Number(dailyCalorieTarget),
    });
    if (!planId) {
      logActivity({
        action: "trainer.diet_plan_create_failed",
        category: "trainer",
        severity: "error",
        message: `No se pudo crear el plan nutricional "${planName}" (IA)`,
        startedAt,
        context: { name: planName, usedAi: true },
      });
      setError("No se pudo crear el plan. Intenta de nuevo.");
      toast.error("No se pudo crear el plan");
      setLoading(false);
      return;
    }

    // Los bloques y las comidas los propone la IA — no se arrancan los
    // 4 de siempre, para no duplicar contra lo que ya sugirió.
    for (let blockIndex = 0; blockIndex < result.blocks.length; blockIndex++) {
      const block = result.blocks[blockIndex];
      const { data: blockRow, error: blockError } = await supabase
        .from("diet_plan_blocks")
        .insert({ diet_plan_id: planId, name: block.name, order_index: blockIndex })
        .select("id")
        .single();
      if (blockError || !blockRow) continue;

      const items = block.items.map((item, itemIndex) => ({
        block_id: blockRow.id,
        order_index: itemIndex,
        dish_id: item.type === "dish" ? item.id : null,
        food_id: item.type === "food" ? item.id : null,
        quantity_grams: item.type === "food" ? (item.quantity_grams ?? 100) : null,
      }));
      if (items.length > 0) {
        await supabase.from("diet_plan_meals").insert(items);
      }
    }

    logActivity({
      action: "trainer.diet_plan_created",
      category: "trainer",
      severity: "success",
      message: `Creó el plan nutricional "${planName}" (con IA)`,
      targetType: "diet_plan",
      targetId: planId,
      targetLabel: planName,
      startedAt,
      context: { usedAi: true, blockCount: result.blocks.length },
    });

    toast.success("Plan generado con IA — revísalo antes de asignarlo");
    router.push(`/entrenador/nutricion/planes/${planId}`);
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

            <div className="mt-1 flex flex-wrap items-center gap-2">
              <Button type="submit" disabled={loading}>
                {loading ? <Loader2 className="animate-spin" /> : null}
                Crear plan
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={loading}
                onClick={() => setAiOpen(true)}
              >
                <Sparkles /> Generar con IA
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <GenerateDietDialog
        key={aiOpen ? "ai-open" : "ai-closed"}
        open={aiOpen}
        onOpenChange={setAiOpen}
        trainerId={trainerId}
        defaultCalorieTarget={dailyCalorieTarget === "" ? null : dailyCalorieTarget}
        onGenerated={handleAiGenerated}
      />
    </div>
  );
}
