"use client";

import * as React from "react";
import { AlertTriangle, FileSpreadsheet, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import { parseExerciseRows, type ParsedExerciseRow } from "@/lib/exercise-import";
import { muscleGroupLabel, equipmentLabel } from "@/lib/format";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

// Valores de respaldo cuando el Excel no trae un grupo muscular o equipo
// reconocible para una fila — así nunca se bloquea la importación, pero
// la fila queda marcada para que el entrenador la revise después.
const FALLBACK_MUSCLE_GROUP = "full_body";
const FALLBACK_EQUIPMENT = "other";

interface ReviewRow extends ParsedExerciseRow {
  included: boolean;
}

export function ImportExercisesDialog({
  open,
  onOpenChange,
  trainerId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** null = se importa a la biblioteca global de Aretia (superadmin), no
   * a la biblioteca de un entrenador en particular. */
  trainerId: string | null;
}) {
  const [rows, setRows] = React.useState<ReviewRow[] | null>(null);
  const [fileName, setFileName] = React.useState<string | null>(null);
  const [parsing, setParsing] = React.useState(false);
  const [importing, setImporting] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  function reset() {
    setRows(null);
    setFileName(null);
  }

  async function handleFileSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setParsing(true);
    setFileName(file.name);
    try {
      const XLSX = await import("xlsx");
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const firstSheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[firstSheetName];
      const sheetRows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1 });
      const parsed = parseExerciseRows(sheetRows);
      if (parsed.length === 0) {
        toast.error("No se encontraron filas con datos en el archivo.");
        setRows(null);
      } else {
        setRows(parsed.map((row) => ({ ...row, included: !row.missingName })));
      }
    } catch (err) {
      console.error(err);
      toast.error("No se pudo leer el archivo. Verifica que sea un Excel válido.");
      setRows(null);
    } finally {
      setParsing(false);
    }
  }

  function toggleRow(rowNumber: number, checked: boolean) {
    setRows((prev) =>
      prev ? prev.map((r) => (r.rowNumber === rowNumber ? { ...r, included: checked } : r)) : prev,
    );
  }

  const includedCount = rows?.filter((r) => r.included).length ?? 0;

  async function handleImport() {
    if (!rows) return;
    const toImport = rows.filter((r) => r.included && !r.missingName);
    if (toImport.length === 0) return;

    setImporting(true);
    const supabase = createClient();
    const { error } = await supabase.from("exercises").insert(
      toImport.map((row) => ({
        trainer_id: trainerId,
        name: row.name,
        muscle_groups:
          row.muscleGroups.values.length > 0 ? row.muscleGroups.values : [FALLBACK_MUSCLE_GROUP],
        equipment_items:
          row.equipmentItems.values.length > 0 ? row.equipmentItems.values : [FALLBACK_EQUIPMENT],
        description: row.description,
        video_url: row.videoUrl,
      })),
    );
    setImporting(false);
    if (error) {
      toast.error("No se pudieron importar los ejercicios", { description: error.message });
      return;
    }
    toast.success(
      `Se importaron ${toImport.length} ejercicio${toImport.length === 1 ? "" : "s"} a tu biblioteca`,
    );
    reset();
    onOpenChange(false);
    window.location.reload();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!importing) {
          if (!next) reset();
          onOpenChange(next);
        }
      }}
    >
      <DialogContent className="flex max-h-[85vh] max-w-2xl flex-col">
        <DialogHeader>
          <DialogTitle>Importar ejercicios desde Excel</DialogTitle>
          <DialogDescription>
            Sube un archivo .xlsx con columnas Nombre, Grupo muscular, Equipo, Descripción y Enlace
            (opcional). Si una fila tiene varios grupos musculares o equipos, sepáralos con "+".
          </DialogDescription>
        </DialogHeader>

        {!rows ? (
          <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border py-10 text-center">
            <FileSpreadsheet className="size-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {fileName ?? "Selecciona un archivo Excel (.xlsx)"}
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={handleFileSelected}
            />
            <Button
              type="button"
              variant="outline"
              disabled={parsing}
              onClick={() => fileInputRef.current?.click()}
            >
              {parsing ? <Loader2 className="animate-spin" /> : <Upload />}
              Elegir archivo
            </Button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>
                {rows.length} fila{rows.length === 1 ? "" : "s"} encontradas — {includedCount} se
                importarán
              </span>
              <Button type="button" variant="ghost" size="sm" onClick={reset}>
                Elegir otro archivo
              </Button>
            </div>

            <div className="flex flex-col gap-2 overflow-y-auto pr-1">
              {rows.map((row) => {
                const hasWarning =
                  row.muscleGroups.unmapped.length > 0 || row.equipmentItems.unmapped.length > 0;
                const shownMuscleGroups =
                  row.muscleGroups.values.length > 0 ? row.muscleGroups.values : [FALLBACK_MUSCLE_GROUP];
                const shownEquipment =
                  row.equipmentItems.values.length > 0
                    ? row.equipmentItems.values
                    : [FALLBACK_EQUIPMENT];

                return (
                  <div
                    key={row.rowNumber}
                    className="flex items-start gap-3 rounded-lg border border-border/80 px-3 py-2.5"
                  >
                    <Checkbox
                      className="mt-1"
                      checked={row.included}
                      disabled={row.missingName}
                      onCheckedChange={(checked) => toggleRow(row.rowNumber, checked === true)}
                    />
                    <div className="min-w-0 flex-1">
                      {row.missingName ? (
                        <p className="text-sm text-destructive">
                          Fila {row.rowNumber}: sin nombre — no se importa
                        </p>
                      ) : (
                        <>
                          <p className="truncate text-sm font-medium">{row.name}</p>
                          <div className="mt-1 flex flex-wrap gap-1">
                            {shownMuscleGroups.map((g) => (
                              <Badge key={g} variant="secondary" className="text-[10px]">
                                {muscleGroupLabel(g)}
                              </Badge>
                            ))}
                            {shownEquipment.map((e) => (
                              <Badge key={e} variant="outline" className="text-[10px]">
                                {equipmentLabel(e)}
                              </Badge>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                    {hasWarning && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <AlertTriangle className="mt-1 size-4 shrink-0 text-amber-500" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-56 text-xs">
                            No se reconoció:{" "}
                            {[...row.muscleGroups.unmapped, ...row.equipmentItems.unmapped].join(", ")}
                            . Se usó un valor genérico — revísalo después de importar.
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                );
              })}
            </div>

            <Button
              type="button"
              disabled={includedCount === 0 || importing}
              onClick={handleImport}
              className="w-fit"
            >
              {importing ? <Loader2 className="animate-spin" /> : <Upload />}
              Importar {includedCount} ejercicio{includedCount === 1 ? "" : "s"}
            </Button>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
