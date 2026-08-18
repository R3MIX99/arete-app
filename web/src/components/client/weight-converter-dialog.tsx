"use client";

import * as React from "react";
import { Copy } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

const LB_TO_KG = 0.45359237;

/** Convierte lo que se pueda escribir a número, o `null` si está vacío
 * o no es un número — así el total no se calcula con NaN. */
function toNumber(value: string): number | null {
  if (!value.trim()) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/**
 * Convertidor de peso: a veces los discos o la báscula del gym marcan en
 * libras, no en kilos, y el cliente necesita pasar ese número a la
 * unidad que usa la app. Dos modos:
 * - "Libras a kilos": conversión directa de un peso.
 * - "Barra + discos": para cuando la barra ya pesa un fijo en kilos (20
 *   por defecto) pero los discos vienen marcados en libras — convierte
 *   solo los discos y suma el peso de la barra.
 * El resultado se puede copiar para pegarlo a mano en el input de peso
 * de la serie — no se enlaza directo a ninguna serie en particular,
 * porque este botón vive junto al historial de cada ejercicio y sirve
 * para cualquiera de sus series.
 */
export function WeightConverterDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [mode, setMode] = React.useState<"simple" | "barbell">("simple");
  const [lb, setLb] = React.useState("");
  const [useBar, setUseBar] = React.useState(true);
  const [barKg, setBarKg] = React.useState("20");
  const [platesLb, setPlatesLb] = React.useState("");

  const totalKg = React.useMemo(() => {
    if (mode === "simple") {
      const n = toNumber(lb);
      return n !== null ? n * LB_TO_KG : null;
    }
    const plates = toNumber(platesLb);
    if (plates === null) return null;
    const bar = useBar ? (toNumber(barKg) ?? 0) : 0;
    return bar + plates * LB_TO_KG;
  }, [mode, lb, useBar, barKg, platesLb]);

  function handleCopy() {
    if (totalKg === null) return;
    navigator.clipboard.writeText(totalKg.toFixed(1)).then(
      () => toast.success("Copiado — pégalo en el peso de tu serie"),
      () => toast.error("No se pudo copiar"),
    );
  }

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange} title="Convertidor de peso">
      <div className="flex flex-col gap-4">
        <div className="flex gap-1 rounded-full bg-muted p-1">
          <button
            type="button"
            onClick={() => setMode("simple")}
            className={cn(
              "flex-1 rounded-full py-1.5 text-sm font-medium transition-colors",
              mode === "simple" ? "bg-primary text-primary-foreground" : "text-muted-foreground",
            )}
          >
            Libras a kilos
          </button>
          <button
            type="button"
            onClick={() => setMode("barbell")}
            className={cn(
              "flex-1 rounded-full py-1.5 text-sm font-medium transition-colors",
              mode === "barbell" ? "bg-primary text-primary-foreground" : "text-muted-foreground",
            )}
          >
            Barra + discos
          </button>
        </div>

        {mode === "simple" ? (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="lb-input">Peso en libras</Label>
            <Input
              id="lb-input"
              inputMode="decimal"
              placeholder="Ej. 135"
              value={lb}
              onChange={(e) => setLb(e.target.value)}
              autoFocus
            />
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="use-bar">Usé barra</Label>
              <Switch id="use-bar" checked={useBar} onCheckedChange={setUseBar} />
            </div>
            {useBar ? (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="bar-kg">Peso de la barra (kg)</Label>
                <Input id="bar-kg" inputMode="decimal" value={barKg} onChange={(e) => setBarKg(e.target.value)} />
              </div>
            ) : null}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="plates-lb">Peso de los discos (libras)</Label>
              <Input
                id="plates-lb"
                inputMode="decimal"
                placeholder="Ej. 90"
                value={platesLb}
                onChange={(e) => setPlatesLb(e.target.value)}
                autoFocus
              />
            </div>
          </div>
        )}

        <div className="flex flex-col items-center gap-1 rounded-xl bg-primary/10 py-5">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total en kilos</span>
          <span className="text-4xl font-bold tabular-nums">{totalKg !== null ? totalKg.toFixed(1) : "—"} kg</span>
        </div>

        <Button type="button" onClick={handleCopy} disabled={totalKg === null}>
          <Copy className="size-4" />
          Copiar resultado
        </Button>
      </div>
    </ResponsiveDialog>
  );
}
