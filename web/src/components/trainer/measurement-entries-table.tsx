"use client";

import * as React from "react";
import { Pencil, Trash2, ClipboardList } from "lucide-react";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import { formatDate } from "@/lib/format";
import { MEASUREMENT_FIELDS, type MeasurementKey, type ProgressMeasurement } from "@/lib/types/progress";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

/**
 * Tabla de las medidas registradas para el metric elegido en el
 * selector de arriba — cada fila es una medición independiente
 * (`progress_measurements`), así que editar o eliminar una nunca
 * afecta a las demás medidas del mismo día.
 */
export function MeasurementEntriesTable({
  measurements,
  metric,
  onEdit,
  onChanged,
}: {
  measurements: ProgressMeasurement[];
  metric: MeasurementKey;
  onEdit: (measurement: ProgressMeasurement) => void;
  onChanged: () => void;
}) {
  const [deleteTarget, setDeleteTarget] = React.useState<ProgressMeasurement | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  const field = MEASUREMENT_FIELDS.find((f) => f.key === metric)!;
  const rows = React.useMemo(
    () =>
      measurements
        .filter((m) => m.metric_key === metric)
        .sort((a, b) => b.entry_date.localeCompare(a.entry_date)),
    [measurements, metric],
  );

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("progress_measurements")
      .delete()
      .eq("id", deleteTarget.id);
    setDeleting(false);
    if (error) {
      toast.error("No se pudo eliminar el registro");
      return;
    }
    toast.success("Registro eliminado");
    setDeleteTarget(null);
    onChanged();
  }

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-10 text-center text-muted-foreground">
        <ClipboardList className="size-6" />
        <p className="text-sm">Todavía no hay registros de {field.label.toLowerCase()}.</p>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-foreground/[0.02] text-left text-xs text-muted-foreground uppercase">
              <th className="px-3 py-2 font-medium">Fecha</th>
              <th className="px-3 py-2 font-medium">{field.label}</th>
              <th className="w-20 px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b last:border-0">
                <td className="px-3 py-2">{formatDate(row.entry_date)}</td>
                <td className="px-3 py-2 tabular-nums">
                  {row.value} {field.unit}
                </td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label="Editar registro"
                      onClick={() => onEdit(row)}
                    >
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label="Eliminar registro"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setDeleteTarget(row)}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={`¿Eliminar este registro de ${field.label.toLowerCase()}?`}
        description={
          deleteTarget
            ? `Se eliminará la medición del ${formatDate(deleteTarget.entry_date)}. Las demás medidas de ese día no se ven afectadas. Esta acción no se puede deshacer.`
            : ""
        }
        loading={deleting}
        onConfirm={handleDelete}
      />
    </>
  );
}
