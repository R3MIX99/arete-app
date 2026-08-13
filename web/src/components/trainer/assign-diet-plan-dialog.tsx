"use client";

import * as React from "react";
import { Check, Loader2, Search, UserX } from "lucide-react";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import { initialsOf } from "@/lib/format";
import type { ClientProfile } from "@/lib/types/client";
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Asignar un plan nutricional a varios clientes. Si el plan tiene una
 * meta calórica diaria, hay un segundo paso opcional para ajustar las
 * porciones a la meta calórica propia del cliente (mismo factor de
 * escala para todos los clientes seleccionados en este lote).
 */
export function AssignDietPlanDialog({
  open,
  onOpenChange,
  trainerId,
  dietPlanId,
  dailyCalorieTarget,
  clients,
  alreadyAssignedClientIds,
  onAssigned,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trainerId: string;
  dietPlanId: string;
  dailyCalorieTarget: number | null;
  clients: ClientProfile[];
  alreadyAssignedClientIds: string[];
  onAssigned: () => void;
}) {
  const [step, setStep] = React.useState<"select" | "scale">("select");
  const [query, setQuery] = React.useState("");
  const [startDate, setStartDate] = React.useState(todayIso());
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [clientTarget, setClientTarget] = React.useState<number | "">("");
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setStep("select");
      setQuery("");
      setStartDate(todayIso());
      setSelected(new Set());
      setClientTarget("");
    }
  }, [open]);

  const alreadySet = React.useMemo(
    () => new Set(alreadyAssignedClientIds),
    [alreadyAssignedClientIds],
  );

  const filtered = clients.filter((client) => {
    if (client.status !== "active") return false;
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      client.full_name.toLowerCase().includes(q) ||
      client.email.toLowerCase().includes(q)
    );
  });

  function toggle(clientId: string) {
    if (alreadySet.has(clientId)) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(clientId)) next.delete(clientId);
      else next.add(clientId);
      return next;
    });
  }

  function goToNextStep() {
    if (selected.size === 0) return;
    if (dailyCalorieTarget) {
      setStep("scale");
    } else {
      void submit(1, null);
    }
  }

  async function submit(scaleFactor: number, targetDailyCalories: number | null) {
    setSaving(true);
    const supabase = createClient();
    const rows = Array.from(selected).map((clientId) => ({
      trainer_id: trainerId,
      client_id: clientId,
      diet_plan_id: dietPlanId,
      start_date: startDate,
      target_daily_calories: targetDailyCalories,
      scale_factor: scaleFactor,
    }));

    const { error, count } = await supabase
      .from("diet_plan_assignments")
      .insert(rows)
      .select("id", { count: "exact" });

    setSaving(false);

    if (error) {
      toast.error("No se pudo asignar a algunos clientes");
      return;
    }

    toast.success(
      `Asignado a ${count ?? rows.length} ${
        (count ?? rows.length) === 1 ? "cliente" : "clientes"
      }`,
    );
    onOpenChange(false);
    onAssigned();
  }

  const scaleFactor =
    dailyCalorieTarget && clientTarget !== "" ? Number(clientTarget) / dailyCalorieTarget : 1;
  const scalePercent = Math.round((scaleFactor - 1) * 100);

  if (step === "scale") {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Ajustar porciones</DialogTitle>
            <DialogDescription>
              El plan está pensado para {dailyCalorieTarget} kcal/día. Si la meta calórica
              del cliente es distinta, las porciones se pueden escalar automáticamente.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="client_target">Meta calórica del cliente (kcal/día)</Label>
              <Input
                id="client_target"
                type="number"
                min={1}
                autoFocus
                value={clientTarget}
                onChange={(e) =>
                  setClientTarget(e.target.value === "" ? "" : Number(e.target.value))
                }
                placeholder={String(dailyCalorieTarget)}
              />
            </div>
            {clientTarget !== "" && (
              <p className="text-sm text-muted-foreground">
                Las porciones se ajustan al{" "}
                <span className="font-medium text-foreground">
                  {scalePercent >= 0 ? "+" : ""}
                  {scalePercent}%
                </span>{" "}
                de lo indicado en el plan.
              </p>
            )}
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                disabled={saving}
                onClick={() => submit(1, null)}
              >
                {saving ? <Loader2 className="animate-spin" /> : null}
                Asignar sin ajustar
              </Button>
              <Button
                type="button"
                className="flex-1"
                disabled={saving || clientTarget === ""}
                onClick={() => submit(scaleFactor, Number(clientTarget))}
              >
                {saving ? <Loader2 className="animate-spin" /> : null}
                Continuar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Asignar a clientes</DialogTitle>
          <DialogDescription>
            Elige la fecha de inicio y los clientes que recibirán este plan.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="start_date">Empieza el</Label>
            <Input
              id="start_date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>

          <div className="relative">
            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar cliente por nombre o correo"
              className="pl-9"
            />
          </div>

          <div className="flex max-h-64 flex-col gap-1 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-8 text-center text-muted-foreground">
                <UserX className="size-6" />
                <p className="text-sm">Ningún cliente activo coincide con la búsqueda.</p>
              </div>
            ) : (
              filtered.map((client) => {
                const isAssigned = alreadySet.has(client.id);
                const isSelected = selected.has(client.id);
                return (
                  <button
                    key={client.id}
                    type="button"
                    disabled={isAssigned}
                    onClick={() => toggle(client.id)}
                    className={cn(
                      "flex items-center gap-3 rounded-lg border border-transparent px-3 py-2 text-left transition-colors",
                      isAssigned
                        ? "cursor-not-allowed opacity-50"
                        : "hover:border-border hover:bg-accent",
                    )}
                  >
                    <Avatar className="size-8">
                      <AvatarFallback className="text-xs">
                        {initialsOf(client.full_name) || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{client.full_name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {isAssigned ? "Ya asignado" : client.email}
                      </p>
                    </div>
                    <div
                      className={cn(
                        "flex size-5 shrink-0 items-center justify-center rounded-full border",
                        isSelected
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-input",
                      )}
                    >
                      {isSelected && <Check className="size-3.5" />}
                    </div>
                  </button>
                );
              })
            )}
          </div>

          <Button type="button" disabled={selected.size === 0} onClick={goToNextStep}>
            {dailyCalorieTarget ? "Continuar" : `Asignar a ${selected.size} ${selected.size === 1 ? "cliente" : "clientes"}`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
