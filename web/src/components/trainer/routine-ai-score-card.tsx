"use client";

import * as React from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import type { RoutineExerciseInput, RoutineGoal, RoutineLevel } from "@/lib/types/routine";
import type { AiScoreResult } from "@/lib/types/ai";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

function isCardioGroup(muscleGroup: string) {
  return muscleGroup === "cardio";
}

function scoreTone(score: number) {
  if (score >= 75) return { bar: "bg-emerald-500", text: "text-emerald-600 dark:text-emerald-400" };
  if (score >= 50) return { bar: "bg-amber-500", text: "text-amber-600 dark:text-amber-400" };
  return { bar: "bg-destructive", text: "text-destructive" };
}

/** Puntaje de IA sobre el balance, volumen y coherencia de la rutina con
 * su objetivo — se calcula bajo demanda (no automáticamente) con lo que
 * hay en pantalla en ese momento, y queda guardado en la rutina. */
export function RoutineAiScoreCard({
  routineId,
  name,
  level,
  goal,
  exercises,
  initialScore,
  initialReasoning,
  initialAnalyzedAt,
}: {
  routineId: string;
  name: string;
  level: RoutineLevel;
  goal: RoutineGoal | null;
  exercises: RoutineExerciseInput[];
  initialScore: number | null;
  initialReasoning: string | null;
  initialAnalyzedAt: string | null;
}) {
  const [score, setScore] = React.useState(initialScore);
  const [reasoning, setReasoning] = React.useState(initialReasoning);
  const [analyzedAt, setAnalyzedAt] = React.useState(initialAnalyzedAt);
  const [loading, setLoading] = React.useState(false);

  async function handleScore() {
    if (exercises.length === 0) {
      toast.error("Agrega al menos un ejercicio antes de calcular el puntaje.");
      return;
    }
    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase.functions.invoke("score-routine", {
      body: {
        routineId,
        name,
        level,
        goal,
        exercises: exercises.map((e) => {
          const cardio = isCardioGroup(e.exercise_muscle_group);
          const first = e.sets[0];
          return {
            exercise_name: e.exercise_name,
            muscle_group: e.exercise_muscle_group,
            equipment: "",
            is_cardio: cardio,
            sets_count: e.sets.length,
            target_reps_min: first?.target_reps_min ?? null,
            target_reps_max: first?.target_reps_max ?? null,
            target_minutes: first?.target_minutes ?? null,
          };
        }),
      },
    });
    setLoading(false);
    if (error || !data || data.error) {
      toast.error(data?.error ?? "No se pudo calcular el puntaje. Intenta de nuevo.");
      return;
    }
    const result = data as AiScoreResult;
    setScore(result.score);
    setReasoning(result.reasoning);
    setAnalyzedAt(new Date().toISOString());
    toast.success("Puntaje actualizado");
  }

  const tone = score !== null ? scoreTone(score) : null;

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
        <CardTitle className="text-sm">Puntaje de IA</CardTitle>
        <Button type="button" variant="outline" size="sm" disabled={loading} onClick={handleScore}>
          {loading ? <Loader2 className="animate-spin" /> : <Sparkles />}
          {score === null ? "Calcular puntaje" : "Recalcular"}
        </Button>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {score === null ? (
          <p className="text-sm text-muted-foreground">
            Todavía no se ha evaluado esta rutina. Calcula un puntaje de balance muscular, volumen y
            coherencia con el objetivo.
          </p>
        ) : (
          <>
            <div className="flex items-center gap-3">
              <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-foreground/[0.08]">
                <div
                  className={cn("h-full rounded-full transition-all", tone?.bar)}
                  style={{ width: `${score}%` }}
                />
              </div>
              <span className={cn("w-12 shrink-0 text-right text-lg font-bold tabular-nums", tone?.text)}>
                {score}
              </span>
            </div>
            {reasoning ? <p className="text-sm text-muted-foreground">{reasoning}</p> : null}
            {analyzedAt ? (
              <p className="text-xs text-muted-foreground">
                Última evaluación:{" "}
                {new Date(analyzedAt).toLocaleDateString("es-MX", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </p>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  );
}
