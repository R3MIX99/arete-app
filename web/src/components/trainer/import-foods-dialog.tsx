"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, FileSpreadsheet, Loader2, Search, Upload } from "lucide-react";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import {
  normalizeFoodName,
  parseFoodRows,
  pickFoodSheetName,
  type FoodCategoryRef,
  type ParsedFoodRow,
} from "@/lib/food-import";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

// Se importa en lotes para que la barra avance de verdad conforme se guarda.
const IMPORT_BATCH_SIZE = 20;

interface ReviewRow extends ParsedFoodRow {
  included: boolean;
  /** Ya existe un alimento con ese nombre (en tu catálogo o repetido en el
   * archivo) — arranca sin seleccionar. */
  duplicate: boolean;
}

export function ImportFoodsDialog({
  open,
  onOpenChange,
  trainerId,
  existingNames,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** null = se importa al catálogo global de Aretia (superadmin). */
  trainerId: string | null;
  existingNames: string[];
}) {
  const router = useRouter();
  const [rows, setRows] = React.useState<ReviewRow[] | null>(null);
  const [fileName, setFileName] = React.useState<string | null>(null);
  const [parsing, setParsing] = React.useState(false);
  const [importing, setImporting] = React.useState(false);
  const [progress, setProgress] = React.useState({ done: 0, total: 0 });
  const [query, setQuery] = React.useState("");
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  function reset() {
    setRows(null);
    setFileName(null);
    setQuery("");
  }

  async function handleFileSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setParsing(true);
    setFileName(file.name);
    try {
      const supabase = createClient();
      const { data: categoryData, error: categoryError } = await supabase
        .from("food_categories")
        .select("id, slug, name");
      if (categoryError || !categoryData) throw new Error("No se pudieron leer las categorías");
      const categories = categoryData as FoodCategoryRef[];

      const XLSX = await import("xlsx");
      const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" });

      const headersBySheet: Record<string, string[]> = {};
      for (const sheetName of workbook.SheetNames) {
        const first = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[sheetName], {
          header: 1,
        })[0];
        headersBySheet[sheetName] = (first ?? []).map((h) => String(h ?? ""));
      }
      const sheetName = pickFoodSheetName(workbook.SheetNames, headersBySheet);
      if (!sheetName) {
        toast.error("No encontré la hoja de alimentos", {
          description: 'Debe llamarse "Alimentos" o tener las columnas Categoría y Calorías.',
        });
        setRows(null);
        return;
      }

      const sheetRows = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[sheetName], {
        header: 1,
      });
      const parsed = parseFoodRows(sheetRows, categories);
      if (parsed.length === 0) {
        toast.error("No se encontraron filas con datos en la hoja.");
        setRows(null);
        return;
      }

      const known = new Set(existingNames.map(normalizeFoodName));
      const seenInFile = new Set<string>();
      setRows(
        parsed.map((row) => {
          const key = normalizeFoodName(row.name);
          const duplicate = key !== "" && (known.has(key) || seenInFile.has(key));
          if (key) seenInFile.add(key);
          return { ...row, duplicate, included: row.errors.length === 0 && !duplicate };
        }),
      );
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

  const visible = React.useMemo(() => {
    if (!rows) return [];
    const q = normalizeFoodName(query);
    return q ? rows.filter((r) => normalizeFoodName(r.name).includes(q)) : rows;
  }, [rows, query]);

  const includedCount = rows?.filter((r) => r.included).length ?? 0;
  const errorCount = rows?.filter((r) => r.errors.length > 0).length ?? 0;
  const duplicateCount = rows?.filter((r) => r.duplicate).length ?? 0;
  const visibleSelectable = visible.filter((r) => r.errors.length === 0);
  const allVisibleSelected =
    visibleSelectable.length > 0 && visibleSelectable.every((r) => r.included);

  function toggleAll(checked: boolean) {
    const targets = new Set(visibleSelectable.map((r) => r.rowNumber));
    setRows((prev) =>
      prev ? prev.map((r) => (targets.has(r.rowNumber) ? { ...r, included: checked } : r)) : prev,
    );
  }

  async function handleImport() {
    if (!rows) return;
    const toImport = rows.filter((r) => r.included && r.errors.length === 0);
    if (toImport.length === 0) return;

    setImporting(true);
    setProgress({ done: 0, total: toImport.length });
    const supabase = createClient();

    let imported = 0;
    for (let i = 0; i < toImport.length; i += IMPORT_BATCH_SIZE) {
      const batch = toImport.slice(i, i + IMPORT_BATCH_SIZE);
      const { error } = await supabase.from("foods").insert(
        batch.map((row) => ({
          trainer_id: trainerId,
          food_category_id: row.categoryId,
          name: row.name,
          calories_per_100g: row.calories,
          protein_per_100g: row.protein,
          carbs_per_100g: row.carbs,
          fat_per_100g: row.fat,
          household_unit_name: row.householdUnitName,
          household_unit_grams: row.householdUnitGrams,
        })),
      );
      if (error) {
        setImporting(false);
        toast.error("No se pudieron importar los alimentos", {
          description:
            imported > 0 ? `Se alcanzaron a guardar ${imported}. ${error.message}` : error.message,
        });
        if (imported > 0) router.refresh();
        return;
      }
      imported += batch.length;
      setProgress({ done: imported, total: toImport.length });
    }

    setImporting(false);
    toast.success(
      `Se importaron ${toImport.length} alimento${toImport.length === 1 ? "" : "s"} a tu catálogo`,
    );
    reset();
    onOpenChange(false);
    router.refresh();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (importing) return;
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent className="flex max-h-[88vh] max-w-2xl flex-col">
        <DialogHeader>
          <DialogTitle>Importar alimentos desde Excel</DialogTitle>
          <DialogDescription>
            Sube un archivo .xlsx con una hoja &ldquo;Alimentos&rdquo; y las columnas Nombre, Categoría,
            Calorías, Proteína, Carbohidratos, Grasa, Medida casera y Equivale a (g). Los valores son
            por cada 100 g.
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
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
              <span>
                {rows.length} filas — {includedCount} se importarán
                {duplicateCount > 0 ? ` · ${duplicateCount} ya existen` : ""}
                {errorCount > 0 ? ` · ${errorCount} con errores` : ""}
              </span>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={visibleSelectable.length === 0 || importing}
                  onClick={() => toggleAll(!allVisibleSelected)}
                >
                  {allVisibleSelected ? "Deseleccionar todos" : "Seleccionar todos"}
                </Button>
                <Button type="button" variant="ghost" size="sm" disabled={importing} onClick={reset}>
                  Elegir otro archivo
                </Button>
              </div>
            </div>

            <div className="relative">
              <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar en la lista"
                className="pl-9"
              />
            </div>

            <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pr-1">
              {visible.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  Ningún alimento coincide con la búsqueda.
                </p>
              ) : (
                visible.map((row) => {
                  const problems = [...row.errors, ...row.warnings];
                  return (
                    <div
                      key={row.rowNumber}
                      className="flex items-start gap-3 rounded-lg border border-border/80 px-3 py-2.5"
                    >
                      <Checkbox
                        className="mt-1"
                        checked={row.included}
                        disabled={row.errors.length > 0 || importing}
                        onCheckedChange={(checked) => toggleRow(row.rowNumber, checked === true)}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {row.name || `Fila ${row.rowNumber}`}
                        </p>
                        <p className="text-xs text-muted-foreground tabular-nums">
                          {row.calories ?? "—"} kcal · P {row.protein ?? "—"} · C {row.carbs ?? "—"} · G{" "}
                          {row.fat ?? "—"}
                          {row.householdUnitName && row.householdUnitGrams
                            ? ` · 1 ${row.householdUnitName} = ${row.householdUnitGrams} g`
                            : ""}
                        </p>
                        <div className="mt-1 flex flex-wrap gap-1">
                          <Badge variant="secondary" className="text-[10px]">
                            {row.categoryLabel || "Sin categoría"}
                          </Badge>
                          {row.duplicate ? (
                            <Badge variant="outline" className="text-[10px]">
                              Ya existe
                            </Badge>
                          ) : null}
                        </div>
                      </div>
                      {problems.length > 0 ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <AlertTriangle
                              className={
                                row.errors.length > 0
                                  ? "mt-1 size-4 shrink-0 text-destructive"
                                  : "mt-1 size-4 shrink-0 text-amber-500"
                              }
                            />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="max-w-56 text-xs">
                              {problems.join(". ")}
                              {row.errors.length > 0 ? ". No se puede importar." : "."}
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      ) : null}
                    </div>
                  );
                })
              )}
            </div>

            {importing ? (
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">
                    Importando {progress.done} de {progress.total} alimentos…
                  </span>
                  <span className="tabular-nums text-muted-foreground">
                    {progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0}%
                  </span>
                </div>
                <Progress value={progress.total > 0 ? (progress.done / progress.total) * 100 : 0} />
              </div>
            ) : (
              <Button
                type="button"
                disabled={includedCount === 0}
                onClick={handleImport}
                className="w-fit"
              >
                <Upload />
                Importar {includedCount} alimento{includedCount === 1 ? "" : "s"}
              </Button>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
