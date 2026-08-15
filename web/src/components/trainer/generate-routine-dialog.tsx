"use client";

import * as React from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import type { ExerciseOption, RoutineGoal, RoutineLevel } from "@/lib/types/routine";
import type { Equipment } from "@/lib/types/exercise";
import type { AiRoutineResult } from "@/lib/types/ai";
import { equipmentLabel } from "@/lib/format";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const GOAL_OPTIONS: { value: RoutineGoal; label: string }[] = [
  { value: "lose_weight", label: "Perder peso" },
  { value: "gain_muscle", label: "Ganar músculo" },
  { value: "maintenance", label: "Mantenimiento" },
  { value: "performance", label: "Rendimiento" },
];

const LEVEL_OPTIONS: { value: RoutineLevel; label: string }[] = [
  { value: "beginner", label: "Principiante" },
  { value: "intermediate", label: "Intermedio" },
  { value: "advanced", label: "Avanzado" },
];

const EQUIPMENT_OPTIONS: Equipment[] = [
  "bodyweight",
  "barbell",
  "dumbbell",
  "machine",
  "cable",
  "kettlebell",
  "resistance_band",
  "bench",
  "other",
];

/** Recolecta objetivo/nivel/días/equipo, manda la biblioteca de
 * ejercicios del entrenador como catálogo, y llama a la Edge Function
 * "generate-routine". El resultado se entrega al padre — este diálogo no
 * guarda nada por sí solo, el entrenador revisa y edita antes de
 * guardar la rutina. */
export function GenerateRoutineDialog({
  open,
  onOpenChange,
  exerciseCatalog,
  onGenerated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exerciseCatalog: ExerciseOption[];
  onGenerated: (result: AiRoutineResult) => void;
}) {
  const [goal, setGoal] = React.useState<RoutineGoal>("gain_muscle");
  const [level, setLevel] = React.useState<RoutineLevel>("beginner");
  const [daysPerWeek, setDaysPerWeek] = React.useState<number | "">(3);
  const [equipment, setEquipment] = React.useState<Set<Equipment>>(new Set());
  const [focus, setFocus] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);


  function toggleEquipment(item: Equipment) {
    setEquipment((prev) => {
      const next = new Set(prev);
      if (next.has(item)) next.delete(item);
      else next.add(item);
      return next;
    });
  }

  async function handleGenerate() {
    if (daysPerWeek === "") return;
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { data, error: fnError } = await supabase.functions.invoke("generate-routine", {
      body: {
        goal,
        level,
        daysPerWeek,
        equipment: Array.from(equipment),
        focus: focus.trim() || undefined,
        catalog: exerciseCatalog.map((e) => ({
          id: e.id,
          name: e.name,
          muscle_group: e.muscle_group,
          equipment: e.equipment,
        })),
      },
    });

    setLoading(false);
    if (fnError || !data || data.error) {
      const message = data?.error ?? "No se pudo generar la rutina. Intenta de nuevo.";
      setError(message);
      toast.error(message);
      return;
    }

    onGenerated(data as AiRoutineResult);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="size-4 text-primary" /> Generar rutina con IA
          </DialogTitle>
          <DialogDescription>
            Usa tu biblioteca de ejercicios cuando puede. Vas a poder revisar y editar todo antes de
            guardarla.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Objetivo</Label>
              <Select value={goal} onValueChange={(v) => setGoal(v as RoutineGoal)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {GOAL_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Nivel</Label>
              <Select value={level} onValueChange={(v) => setLevel(v as RoutineLevel)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LEVEL_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="days_per_week">Días de entrenamiento por semana</Label>
            <Input
              id="days_per_week"
              type="number"
              min={1}
              max={7}
              value={daysPerWeek}
              onChange={(e) => setDaysPerWeek(e.target.value === "" ? "" : Number(e.target.value))}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Equipo disponible (opcional — vacío = cualquiera)</Label>
            <div className="flex flex-wrap gap-1.5">
              {EQUIPMENT_OPTIONS.map((item) => (
                <Badge
                  key={item}
                  variant={equipment.has(item) ? "default" : "outline"}
                  className="h-7 cursor-pointer px-3"
                  onClick={() => toggleEquipment(item)}
                >
                  {equipmentLabel(item)}
                </Badge>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="focus">Enfoque o pedido adicional (opcional)</Label>
            <Input
              id="focus"
              value={focus}
              onChange={(e) => setFocus(e.target.value)}
              placeholder="Ej. piernas y glúteo, poco impacto en rodillas..."
            />
          </div>

          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}

          <Button type="button" disabled={loading || daysPerWeek === ""} onClick={handleGenerate}>
            {loading ? <Loader2 className="animate-spin" /> : <Sparkles />}
            {loading ? "Generando..." : "Generar rutina"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
