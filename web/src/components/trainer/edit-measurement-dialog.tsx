"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import { MEASUREMENT_FIELDS, type ProgressMeasurement } from "@/lib/types/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/** Edita una sola medida (una fila de `progress_measurements`) — no toca las demás. */
export function EditMeasurementDialog({
  open,
  onOpenChange,
  measurement,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  measurement: ProgressMeasurement | null;
  onSaved: () => void;
}) {
  const router = useRouter();
  const [entryDate, setEntryDate] = React.useState("");
  const [value, setValue] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open && measurement) {
      setEntryDate(measurement.entry_date);
      setValue(String(measurement.value));
      setError(null);
    }
  }, [open, measurement]);

  const field = measurement
    ? MEASUREMENT_FIELDS.find((f) => f.key === measurement.metric_key)
    : null;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!measurement) return;
    if (!value.trim() || Number(value) <= 0) {
      setError("Ingresa un valor válido.");
      return;
    }
    setSaving(true);
    setError(null);

    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("progress_measurements")
      .update({ entry_date: entryDate, value: Number(value) })
      .eq("id", measurement.id);

    setSaving(false);
    if (updateError) {
      setError("No se pudo guardar el cambio. Intenta de nuevo.");
      toast.error("No se pudo guardar el cambio");
      return;
    }

    toast.success("Medición actualizada");
    onOpenChange(false);
    onSaved();
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Editar {field?.label.toLowerCase()}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit_entry_date">Fecha</Label>
            <Input
              id="edit_entry_date"
              type="date"
              value={entryDate}
              onChange={(e) => setEntryDate(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit_value">
              {field?.label} ({field?.unit})
            </Label>
            <Input
              id="edit_value"
              type="number"
              min={0}
              step="0.1"
              autoFocus
              value={value}
              onChange={(e) => setValue(e.target.value)}
            />
          </div>

          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}

          <Button type="submit" disabled={saving} className="w-fit">
            {saving ? <Loader2 className="animate-spin" /> : null}
            Guardar cambios
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
