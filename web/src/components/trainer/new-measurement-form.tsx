"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import { MEASUREMENT_FIELDS } from "@/lib/types/progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Pantalla completa para registrar una medición: una fila por campo, en
 * lista, para irla llenando mientras se mide al cliente en persona — a
 * diferencia del diálogo anterior (una rejilla apretada de dos columnas),
 * aquí cada campo tiene su propio renglón con su unidad a la vista.
 *
 * Igual que antes: una fila nueva por cada campo que se llene, todas con
 * la misma fecha pero independientes entre sí (`progress_measurements`),
 * así que después se pueden editar o borrar una por una.
 */
export function NewMeasurementForm({
  clientId,
  trainerId,
  clientName,
  backHref,
}: {
  clientId: string;
  trainerId: string;
  clientName: string;
  backHref: string;
}) {
  const router = useRouter();
  const [entryDate, setEntryDate] = React.useState(todayIso());
  const [values, setValues] = React.useState<Record<string, string>>({});
  const [notes, setNotes] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const filledCount = MEASUREMENT_FIELDS.filter((f) => values[f.key]?.trim()).length;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const filledFields = MEASUREMENT_FIELDS.filter((f) => values[f.key]?.trim());
    if (filledFields.length === 0) {
      setError("Registra al menos una medida.");
      return;
    }
    setSaving(true);
    setError(null);

    const rows = filledFields.map((field) => ({
      client_id: clientId,
      trainer_id: trainerId,
      entry_date: entryDate,
      metric_key: field.key,
      value: Number(values[field.key]),
      notes: notes || null,
    }));

    const supabase = createClient();
    const { error: insertError } = await supabase.from("progress_measurements").insert(rows);

    setSaving(false);
    if (insertError) {
      setError("No se pudo guardar la medición. Intenta de nuevo.");
      toast.error("No se pudo guardar la medición");
      return;
    }

    toast.success(
      filledFields.length === 1 ? "Medida registrada" : `${filledFields.length} medidas registradas`,
    );
    router.push(backHref);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto flex max-w-lg flex-col gap-5 p-4 pb-28">
      <div className="flex items-center gap-2">
        <Link
          href={backHref}
          aria-label="Cancelar y volver"
          className="-ml-2 flex size-9 items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <ChevronLeft className="size-5" />
        </Link>
        <div className="min-w-0">
          <h1 className="text-lg font-semibold">Nueva medición</h1>
          <p className="truncate text-sm text-muted-foreground">{clientName}</p>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="entry_date">Fecha</Label>
        <Input
          id="entry_date"
          type="date"
          className="w-fit"
          value={entryDate}
          onChange={(e) => setEntryDate(e.target.value)}
        />
      </div>

      <div className="flex flex-col rounded-lg border">
        {MEASUREMENT_FIELDS.map((field, index) => (
          <div
            key={field.key}
            className={
              index > 0
                ? "flex items-center justify-between gap-4 border-t px-4 py-3"
                : "flex items-center justify-between gap-4 px-4 py-3"
            }
          >
            <Label htmlFor={field.key} className="text-sm font-normal">
              {field.label}
            </Label>
            <div className="relative w-32 shrink-0">
              <Input
                id={field.key}
                type="number"
                inputMode="decimal"
                min={0}
                step="0.1"
                placeholder="0"
                className="pr-11 text-right"
                value={values[field.key] ?? ""}
                onChange={(e) => setValues((prev) => ({ ...prev, [field.key]: e.target.value }))}
              />
              <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-muted-foreground">
                {field.unit}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="notes">Notas (opcional)</Label>
        <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
      </div>

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      {/* Fija abajo: con 17 campos la lista es larga y el botón se sale de
          la pantalla si va suelto al final del formulario. */}
      <div className="fixed inset-x-0 bottom-0 border-t bg-background/95 p-4 backdrop-blur-sm">
        <div className="mx-auto flex max-w-lg items-center gap-3">
          <Button type="submit" disabled={saving} className="flex-1">
            {saving ? <Loader2 className="animate-spin" /> : null}
            Guardar medición
          </Button>
          {filledCount > 0 ? (
            <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
              {filledCount} {filledCount === 1 ? "medida" : "medidas"}
            </span>
          ) : null}
        </div>
      </div>
    </form>
  );
}
