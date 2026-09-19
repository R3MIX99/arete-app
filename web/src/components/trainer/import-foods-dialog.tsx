"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  FileSpreadsheet,
  Loader2,
  Search,
  Upload,
} from "lucide-react";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import {
  normalizeFoodName,
  parseFoodRows,
  pickFoodSheetName,
  type FoodCategoryRef,
  type ParsedFoodRow,
} from "@/lib/food-import";
import { cn } from "@/lib/utils";
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

export interface ExistingFood {
  id: string;
  name: string;
  trainer_id: string | null;
}

interface ReviewRow extends ParsedFoodRow {
  included: boolean;
  /** Ya hay un alimento con ese nombre en el catálogo. */
  existing: { id: string; canReplace: boolean } | null;
  /** El mismo nombre aparece antes en el propio archivo. */
  repeatedInFile: boolean;
}

type DuplicateAction = "skip" | "replace";

function DecisionCard({
  selected,
  title,
  description,
  onSelect,
}: {
  selected: boolean;
  title: string;
  description: string;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className={cn(
        "flex items-start gap-3 rounded-xl border p-4 text-left transition-colors",
        selected ? "border-primary bg-primary/5" : "hover:border-primary/40",
      )}
    >
      <span
        className={cn(
          "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border",
          selected ? "border-primary bg-primary text-primary-foreground" : "border-input",
        )}
      >
        {selected ? <Check className="size-3.5" /> : null}
      </span>
      <span className="flex flex-col gap-0.5">
        <span className="text-sm font-semibold">{title}</span>
        <span className="text-sm text-muted-foreground">{description}</span>
      </span>
    </button>
  );
}

export function ImportFoodsDialog({
  open,
  onOpenChange,
  trainerId,
  existingFoods,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** null = se importa al catálogo global de Aretia (superadmin). */
  trainerId: string | null;
  existingFoods: ExistingFood[];
}) {
  const router = useRouter();
  const [rows, setRows] = React.useState<ReviewRow[] | null>(null);
  const [fileName, setFileName] = React.useState<string | null>(null);
  const [parsing, setParsing] = React.useState(false);
  const [importing, setImporting] = React.useState(false);
  const [progress, setProgress] = React.useState({ done: 0, total: 0 });
  const [query, setQuery] = React.useState("");
  const [step, setStep] = React.useState<"review" | "confirm">("review");
  const [duplicateAction, setDuplicateAction] = React.useState<DuplicateAction>("skip");
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  function reset() {
    setRows(null);
    setFileName(null);
    setQuery("");
    setStep("review");
    setDuplicateAction("skip");
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

      // Si hay dos con el mismo nombre (uno esencial y uno tuyo), se
      // prefiere el tuyo: es el único que se puede reemplazar.
      const existingByName = new Map<string, ExistingFood>();
      for (const food of existingFoods) {
        const key = normalizeFoodName(food.name);
        const current = existingByName.get(key);
        if (!current || (food.trainer_id === trainerId && current.trainer_id !== trainerId)) {
          existingByName.set(key, food);
        }
      }

      const seenInFile = new Set<string>();
      setRows(
        parsed.map((row) => {
          const key = normalizeFoodName(row.name);
          const match = key ? existingByName.get(key) : undefined;
          const repeatedInFile = key !== "" && seenInFile.has(key);
          if (key) seenInFile.add(key);
          return {
            ...row,
            existing: match ? { id: match.id, canReplace: match.trainer_id === trainerId } : null,
            repeatedInFile,
            included: row.errors.length === 0 && !repeatedInFile,
          };
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

  const chosen = rows?.filter((r) => r.included && r.errors.length === 0) ?? [];
  const newRows = chosen.filter((r) => !r.existing);
  const duplicateRows = chosen.filter((r) => r.existing);
  const replaceableRows = duplicateRows.filter((r) => r.existing?.canReplace);
  const lockedRows = duplicateRows.length - replaceableRows.length;
  const errorCount = rows?.filter((r) => r.errors.length > 0).length ?? 0;
  const existingCount = rows?.filter((r) => r.existing).length ?? 0;
  const visibleSelectable = visible.filter((r) => r.errors.length === 0);
  const allVisibleSelected =
    visibleSelectable.length > 0 && visibleSelectable.every((r) => r.included);

  function toggleAll(checked: boolean) {
    const targets = new Set(visibleSelectable.map((r) => r.rowNumber));
    setRows((prev) =>
      prev ? prev.map((r) => (targets.has(r.rowNumber) ? { ...r, included: checked } : r)) : prev,
    );
  }

  function handleConfirmClick() {
    if (duplicateRows.length > 0) setStep("confirm");
    else void runImport("skip");
  }

  async function runImport(action: DuplicateAction) {
    const toReplace = action === "replace" ? replaceableRows : [];
    const total = newRows.length + toReplace.length;
    if (total === 0) {
      toast.info("No hay nada que importar con esa elección.");
      return;
    }

    setImporting(true);
    setProgress({ done: 0, total });
    const supabase = createClient();
    let done = 0;
    let failedUpdates = 0;

    const fields = (row: ReviewRow) => ({
      food_category_id: row.categoryId,
      calories_per_100g: row.calories,
      protein_per_100g: row.protein,
      carbs_per_100g: row.carbs,
      fat_per_100g: row.fat,
      household_unit_name: row.householdUnitName,
      household_unit_grams: row.householdUnitGrams,
    });

    for (let i = 0; i < newRows.length; i += IMPORT_BATCH_SIZE) {
      const batch = newRows.slice(i, i + IMPORT_BATCH_SIZE);
      const { error } = await supabase
        .from("foods")
        .insert(batch.map((row) => ({ trainer_id: trainerId, name: row.name, ...fields(row) })));
      if (error) {
        setImporting(false);
        toast.error("No se pudieron importar los alimentos", {
          description: done > 0 ? `Se alcanzaron a guardar ${done}. ${error.message}` : error.message,
        });
        if (done > 0) router.refresh();
        return;
      }
      done += batch.length;
      setProgress({ done, total });
    }

    // Reemplazar = actualizar el alimento que ya existe (mismo id), así los
    // platillos y planes que lo usan no se rompen.
    for (const row of toReplace) {
      const { data, error } = await supabase
        .from("foods")
        .update(fields(row))
        .eq("id", row.existing!.id)
        .select("id");
      if (error || !data || data.length === 0) failedUpdates += 1;
      done += 1;
      setProgress({ done, total });
    }

    setImporting(false);
    const replaced = toReplace.length - failedUpdates;
    const skipped = duplicateRows.length - replaced;
    const parts = [
      `${newRows.length} nuevo${newRows.length === 1 ? "" : "s"}`,
      replaced > 0 ? `${replaced} reemplazado${replaced === 1 ? "" : "s"}` : null,
      skipped > 0 ? `${skipped} omitido${skipped === 1 ? "" : "s"}` : null,
    ].filter(Boolean);
    if (failedUpdates > 0) {
      toast.warning(`Importación con detalles: ${parts.join(", ")}`, {
        description: `${failedUpdates} no se pudieron actualizar.`,
      });
    } else {
      toast.success(`Importación lista: ${parts.join(", ")}`);
    }
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
        ) : step === "confirm" ? (
          <div className="flex min-h-0 flex-1 flex-col gap-4">
            <div>
              <p className="text-sm font-semibold">
                {duplicateRows.length} alimento{duplicateRows.length === 1 ? "" : "s"} del archivo
                ya existe{duplicateRows.length === 1 ? "" : "n"} en tu catálogo
              </p>
              <p className="text-sm text-muted-foreground">¿Qué hacemos con ellos?</p>
            </div>

            <div className="flex flex-col gap-2">
              <DecisionCard
                selected={duplicateAction === "skip"}
                title="Omitirlos"
                description="Se quedan como están. Solo se importan los alimentos nuevos."
                onSelect={() => setDuplicateAction("skip")}
              />
              <DecisionCard
                selected={duplicateAction === "replace"}
                title="Reemplazarlos"
                description="Se actualizan con los datos del Excel (categoría, calorías, macros y medida casera). Los platillos y planes que ya los usan se conservan."
                onSelect={() => setDuplicateAction("replace")}
              />
            </div>

            {duplicateAction === "replace" && lockedRows > 0 ? (
              <p className="text-xs text-muted-foreground">
                {lockedRows} de ellos {lockedRows === 1 ? "es un alimento esencial" : "son alimentos esenciales"}{" "}
                de Aretia y no se pueden reemplazar: {lockedRows === 1 ? "se omite" : "se omiten"}.
              </p>
            ) : null}

            <div className="min-h-0 flex-1 overflow-y-auto rounded-lg bg-foreground/[0.04] p-3">
              <ul className="flex flex-col gap-1 text-sm">
                {duplicateRows.map((r) => (
                  <li key={r.rowNumber} className="flex items-center justify-between gap-2">
                    <span className="truncate">{r.name}</span>
                    {duplicateAction === "replace" && !r.existing?.canReplace ? (
                      <Badge variant="outline" className="shrink-0 text-[10px]">
                        Esencial: se omite
                      </Badge>
                    ) : null}
                  </li>
                ))}
              </ul>
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
              <div className="flex flex-wrap items-center gap-2">
                <Button type="button" variant="ghost" onClick={() => setStep("review")}>
                  <ArrowLeft /> Volver
                </Button>
                <Button type="button" onClick={() => runImport(duplicateAction)}>
                  <Upload />
                  Confirmar importación
                </Button>
                <span className="text-xs text-muted-foreground">
                  {newRows.length} nuevo{newRows.length === 1 ? "" : "s"}
                  {duplicateAction === "replace" && replaceableRows.length > 0
                    ? ` + ${replaceableRows.length} por reemplazar`
                    : ""}
                </span>
              </div>
            )}
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
              <span>
                {rows.length} filas — {newRows.length} nuevos
                {existingCount > 0 ? ` · ${existingCount} ya existen` : ""}
                {errorCount > 0 ? ` · ${errorCount} con errores` : ""}
              </span>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={visibleSelectable.length === 0}
                  onClick={() => toggleAll(!allVisibleSelected)}
                >
                  {allVisibleSelected ? "Deseleccionar todos" : "Seleccionar todos"}
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={reset}>
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
                        disabled={row.errors.length > 0}
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
                          {row.existing ? (
                            <Badge variant="outline" className="text-[10px]">
                              Ya existe
                            </Badge>
                          ) : null}
                          {row.repeatedInFile ? (
                            <Badge variant="outline" className="text-[10px]">
                              Repetido en el archivo
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
                disabled={chosen.length === 0}
                onClick={handleConfirmClick}
                className="w-fit"
              >
                <Upload />
                Importar {chosen.length} alimento{chosen.length === 1 ? "" : "s"}
              </Button>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
