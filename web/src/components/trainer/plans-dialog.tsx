"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PlansView } from "@/components/trainer/plans-view";
import type { SubscriptionPlan } from "@/lib/types/settings";

/** Diálogo con la comparativa de planes. Se abre desde un botón cuando el
 *  entrenador topa un límite o intenta usar algo fuera de su plan. */
export function PlansDialog({
  open,
  onOpenChange,
  currentPlan,
  reason,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentPlan: SubscriptionPlan;
  reason?: string;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Planes de Aretia</DialogTitle>
          <DialogDescription>
            Tu plan actual y a dónde puedes subir. El cobro anual te da dos meses gratis.
          </DialogDescription>
        </DialogHeader>
        {open && <PlansView currentPlan={currentPlan} reason={reason} />}
      </DialogContent>
    </Dialog>
  );
}
