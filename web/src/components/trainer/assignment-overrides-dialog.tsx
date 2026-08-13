"use client";

import * as React from "react";
import { RotateCcw } from "lucide-react";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import { weekdayLabel } from "@/lib/format";
import type { ProgramSlot, RoutineOption, SlotOverride } from "@/lib/types/program";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RoutinePickerDialog } from "@/components/trainer/routine-picker-dialog";

/**
 * Ajusta, solo para un cliente asignado, qué rutina cae en cada casilla
 * del programa — sin tocar la plantilla compartida por los demás
 * clientes. Se guarda como upsert en `assignment_overrides`
 * (único por assignment_id + program_routine_id).
 */
export function AssignmentOverridesDialog({
  open,
  onOpenChange,
  assignmentId,
  clientName,
  slots,
  overrides,
  routineCatalog,
  onChanged,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assignmentId: string;
  clientName: string;
  slots: ProgramSlot[];
  overrides: SlotOverride[];
  routineCatalog: RoutineOption[];
  onChanged: () => void;
}) {
  const [pickerSlotId, setPickerSlotId] = React.useState<string | null>(null);
  const [busySlotId, setBusySlotId] = React.useState<string | null>(null);

  const overrideBySlot = React.useMemo(() => {
    const map = new Map<string, SlotOverride>();
    for (const override of overrides) map.set(override.program_routine_id, override);
    return map;
  }, [overrides]);

  async function handlePick(routine: RoutineOption) {
    if (!pickerSlotId) return;
    setBusySlotId(pickerSlotId);
    const supabase = createClient();
    const { error } = await supabase.from("assignment_overrides").upsert(
      {
        assignment_id: assignmentId,
        program_routine_id: pickerSlotId,
        routine_id: routine.id,
      },
      { onConflict: "assignment_id,program_routine_id" },
    );
    setBusySlotId(null);
    setPickerSlotId(null);
    if (error) {
      toast.error("No se pudo personalizar la rutina");
      return;
    }
    toast.success("Rutina personalizada para este cliente");
    onChanged();
  }

  async function handleRemove(override: SlotOverride) {
    setBusySlotId(override.program_routine_id);
    const supabase = createClient();
    const { error } = await supabase
      .from("assignment_overrides")
      .delete()
      .eq("id", override.id);
    setBusySlotId(null);
    if (error) {
      toast.error("No se pudo revertir el cambio");
      return;
    }
    toast.success("Se restauró la rutina original");
    onChanged();
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajustar rutinas de {clientName}</DialogTitle>
            <DialogDescription>
              Esto solo cambia lo que ve {clientName} — la plantilla del programa sigue
              igual para el resto de tus clientes.
            </DialogDescription>
          </DialogHeader>

          <div className="flex max-h-96 flex-col gap-2 overflow-y-auto">
            {slots.map((slot) => {
              const override = overrideBySlot.get(slot.id);
              const effectiveName = override?.routine_name ?? slot.routine_name;
              const busy = busySlotId === slot.id;
              return (
                <div
                  key={slot.id}
                  className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">
                      Semana {slot.week_number} · {weekdayLabel(slot.day_of_week)}
                    </p>
                    <p className="truncate text-sm font-medium">{effectiveName}</p>
                    {override && (
                      <Badge variant="secondary" className="mt-1 text-[10px]">
                        Personalizado para {clientName}
                      </Badge>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    {override && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label="Restaurar rutina original"
                        disabled={busy}
                        onClick={() => handleRemove(override)}
                      >
                        <RotateCcw className="size-3.5" />
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={busy}
                      onClick={() => setPickerSlotId(slot.id)}
                    >
                      Cambiar
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      <RoutinePickerDialog
        open={pickerSlotId !== null}
        onOpenChange={(open) => !open && setPickerSlotId(null)}
        routines={routineCatalog}
        onPick={handlePick}
      />
    </>
  );
}
