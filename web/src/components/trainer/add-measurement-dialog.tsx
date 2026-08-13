"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import { MEASUREMENT_FIELDS } from "@/lib/types/progress";
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
import { Textarea } from "@/components/ui/textarea";

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Registra una medición completa: una fila nueva por cada campo que se
 * llene, todas con la misma fecha — pero independientes entre sí (ver
 * `progress_measurements`), así que después se pueden editar o borrar
 * una por una sin arrastrar a las demás.
 */
export function AddMeasurementDialog({
  open,
  onOpenChange,
  clientId,
  trainerId,
  onAdded,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  trainerId: string;
  onAdded: () => void;
}) {
  const router = useRouter();
  const [entryDate, setEntryDate] = React.useState(todayIso());
  const [values, setValues] = React.useState<Record<string, string>>({});
  const [notes, setNotes] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open) {
      setEntryDate(todayIso());
      setValues({});
      setNotes("");
      setError(null);
    }
  }, [open]);

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

    toast.success("Medición registrada");
    onOpenChange(false);
    onAdded();
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nueva medición</DialogTitle>
          <DialogDescription>
            Deja en blanco lo que no hayas medido esta vez.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="entry_date">Fecha</Label>
            <Input
              id="entry_date"
              type="date"
              value={entryDate}
              onChange={(e) => setEntryDate(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {MEASUREMENT_FIELDS.map((field) => (
              <div key={field.key} className="flex flex-col gap-1.5">
                <Label htmlFor={field.key}>
                  {field.label} ({field.unit})
                </Label>
                <Input
                  id={field.key}
                  type="number"
                  min={0}
                  step="0.1"
                  value={values[field.key] ?? ""}
                  onChange={(e) =>
                    setValues((prev) => ({ ...prev, [field.key]: e.target.value }))
                  }
                />
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="notes">Notas (opcional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>

          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}

          <Button type="submit" disabled={saving} className="w-fit">
            {saving ? <Loader2 className="animate-spin" /> : null}
            Guardar medición
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
