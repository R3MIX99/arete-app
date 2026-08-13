"use client";

import * as React from "react";
import { Pencil, Trash2, ClipboardList } from "lucide-react";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import { formatDate } from "@/lib/format";
import { MEASUREMENT_FIELDS, type MeasurementKey, type ProgressEntry } from "@/lib/types/progress";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

/**
 * Tabla de todos los registros de progreso de un cliente, con la
 * columna de valor siguiendo la medida elegida en el selector de la
 * gráfica de arriba — editar y eliminar (con confirmación) por fila.
 */
export function MeasurementEntriesTable({
  entries,
  metric,
  onEdit,
  onChanged,
}: {
  entries: ProgressEntry[];
  metric: MeasurementKey;
  onEdit: (entry: ProgressEntry) => void;
  onChanged: () => void;
}) {
  const [deleteTarget, setDeleteTarget] = React.useState<ProgressEntry | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  const field = MEASUREMENT_FIELDS.find((f) => f.key === metric)!;
  const sorted = React.useMemo(
    () => [...entries].sort((a, b) => b.entry_date.localeCompare(a.entry_date)),
    [entries],
  );

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("progress_entries")
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

  if (sorted.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-10 text-center text-muted-foreground">
        <ClipboardList className="size-6" />
        <p className="text-sm">Todavía no hay registros de progreso.</p>
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
            {sorted.map((entry) => {
              const value = entry[metric];
              return (
                <tr key={entry.id} className="border-b last:border-0">
                  <td className="px-3 py-2">{formatDate(entry.entry_date)}</td>
                  <td className="px-3 py-2 tabular-nums">
                    {value !== null && value !== undefined ? (
                      `${value} ${field.unit}`
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label="Editar registro"
                        onClick={() => onEdit(entry)}
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label="Eliminar registro"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setDeleteTarget(entry)}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="¿Eliminar este registro?"
        description={
          deleteTarget
            ? `Se eliminará por completo la medición del ${formatDate(deleteTarget.entry_date)}. Esta acción no se puede deshacer.`
            : ""
        }
        loading={deleting}
        onConfirm={handleDelete}
      />
    </>
  );
}
