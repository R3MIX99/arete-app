"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, Search } from "lucide-react";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import { logActivity, startTiming } from "@/lib/log-activity";
import { clientGoalLabels } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

export interface ProgramOption {
  id: string;
  name: string;
  goal: string | null;
  duration_weeks: number;
}

export interface DietPlanOption {
  id: string;
  name: string;
}

/** Qué asignación se está por cambiar: el programa (client_assignments)
 * o el plan nutricional (diet_plan_assignments) del cliente. */
export type ChangeAssignmentTarget = {
  kind: "program" | "diet";
  /** id de la fila en client_assignments / diet_plan_assignments. */
  assignmentId: string;
  /** program_id / diet_plan_id actual (para marcarlo como "Actual"). */
  currentId: string;
  currentName: string;
};

const GOALS = ["gain_muscle", "lose_weight", "maintenance", "performance"] as const;

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function ChangeAssignmentDialog({
  target,
  onOpenChange,
  clientId,
  clientName,
  trainerId,
  programs,
  dietPlans,
  onChanged,
}: {
  target: ChangeAssignmentTarget | null;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  clientName: string;
  trainerId: string;
  programs: ProgramOption[];
  dietPlans: DietPlanOption[];
  onChanged: () => void;
}) {
  const isProgram = target?.kind === "program";
  return (
    <Dialog open={target !== null} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isProgram ? "Cambiar de programa" : "Cambiar de plan nutricional"}
          </DialogTitle>
          <DialogDescription>
            {clientName} pasa {isProgram ? "al programa" : "al plan"} que elijas — el anterior se
            reemplaza y la fecha de inicio queda en hoy.
          </DialogDescription>
        </DialogHeader>
        {/* key por assignmentId: al reabrir para otra asignación el
         * cuerpo se remonta con la búsqueda/filtros limpios. */}
        {target && (
          <ChangeAssignmentBody
            key={target.assignmentId}
            target={target}
            clientId={clientId}
            clientName={clientName}
            trainerId={trainerId}
            programs={programs}
            dietPlans={dietPlans}
            onChanged={onChanged}
            onOpenChange={onOpenChange}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function ChangeAssignmentBody({
  target,
  clientId,
  clientName,
  trainerId,
  programs,
  dietPlans,
  onChanged,
  onOpenChange,
}: {
  target: ChangeAssignmentTarget;
  clientId: string;
  clientName: string;
  trainerId: string;
  programs: ProgramOption[];
  dietPlans: DietPlanOption[];
  onChanged: () => void;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const isProgram = target.kind === "program";
  const [query, setQuery] = React.useState("");
  const [goal, setGoal] = React.useState<string | null>(null);
  const [savingId, setSavingId] = React.useState<string | null>(null);

  const items: (ProgramOption | DietPlanOption)[] = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (isProgram) {
      return programs.filter((p) => {
        if (goal && p.goal !== goal) return false;
        if (q && !p.name.toLowerCase().includes(q)) return false;
        return true;
      });
    }
    return dietPlans.filter((p) => (q ? p.name.toLowerCase().includes(q) : true));
  }, [isProgram, programs, dietPlans, query, goal]);

  async function pick(id: string, name: string) {
    if (id === target.currentId || savingId) return;
    setSavingId(id);
    const startedAt = startTiming();
    const supabase = createClient();
    const table = isProgram ? "client_assignments" : "diet_plan_assignments";

    // client_assignments / diet_plan_assignments no tienen policy de
    // UPDATE para el entrenador, así que "cambiar" es borrar la fila
    // anterior (sus assignment_overrides caen en cascada) y crear una
    // nueva. Se borra primero para no dejar dos programas activos a la
    // vez ni por un instante.
    const { error: delError } = await supabase.from(table).delete().eq("id", target.assignmentId);
    if (delError) {
      setSavingId(null);
      toast.error("No se pudo cambiar — intenta de nuevo");
      return;
    }

    const row = isProgram
      ? { trainer_id: trainerId, client_id: clientId, program_id: id, start_date: todayIso() }
      : { trainer_id: trainerId, client_id: clientId, diet_plan_id: id, start_date: todayIso() };
    const { error: insError } = await supabase.from(table).insert(row);
    setSavingId(null);

    if (insError) {
      logActivity({
        action: isProgram ? "trainer.program_change_failed" : "trainer.diet_plan_change_failed",
        category: "trainer",
        severity: "error",
        message: `No se pudo asignar ${isProgram ? "el programa" : "el plan"} "${name}" a ${clientName} — quedó sin ${isProgram ? "programa" : "plan"}`,
        targetType: isProgram ? "program" : "diet_plan",
        targetId: id,
        targetLabel: name,
        startedAt,
        context: { clientId, from: target.currentName, reason: insError.message },
      });
      toast.error(`Se quitó el anterior pero no se pudo asignar "${name}". Asígnalo de nuevo.`);
      onChanged();
      onOpenChange(false);
      return;
    }

    logActivity({
      action: isProgram ? "trainer.program_changed" : "trainer.diet_plan_changed",
      category: "trainer",
      severity: "success",
      message: `Cambió ${isProgram ? "el programa" : "el plan"} de ${clientName}: "${target.currentName}" → "${name}"`,
      targetType: isProgram ? "program" : "diet_plan",
      targetId: id,
      targetLabel: name,
      startedAt,
      context: { clientId, from: target.currentName },
    });
    toast.success(`${clientName} ahora tiene "${name}"`);
    onChanged();
    onOpenChange(false);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="relative">
        <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={isProgram ? "Buscar programa por nombre" : "Buscar plan por nombre"}
          className="pl-9"
        />
      </div>

      {isProgram && (
        <div className="flex flex-wrap gap-1.5">
          <FilterChip active={goal === null} onClick={() => setGoal(null)}>
            Todos
          </FilterChip>
          {GOALS.map((g) => (
            <FilterChip key={g} active={goal === g} onClick={() => setGoal(goal === g ? null : g)}>
              {clientGoalLabels[g]}
            </FilterChip>
          ))}
        </div>
      )}

      <div className="flex max-h-72 flex-col gap-1 overflow-y-auto">
        {items.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            {isProgram
              ? "Ningún programa coincide con la búsqueda."
              : "Ningún plan coincide con la búsqueda."}
          </p>
        ) : (
          items.map((item) => {
            const isCurrent = item.id === target.currentId;
            const program = "duration_weeks" in item ? item : null;
            return (
              <button
                key={item.id}
                type="button"
                disabled={isCurrent || savingId !== null}
                onClick={() => pick(item.id, item.name)}
                className={cn(
                  "flex items-center gap-3 rounded-lg border border-transparent px-3 py-2.5 text-left transition-colors",
                  isCurrent
                    ? "cursor-default opacity-60"
                    : "hover:border-border hover:bg-accent",
                )}
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{item.name}</p>
                  {program && (
                    <p className="truncate text-xs text-muted-foreground">
                      {program.duration_weeks}{" "}
                      {program.duration_weeks === 1 ? "semana" : "semanas"}
                      {program.goal
                        ? ` · ${clientGoalLabels[program.goal] ?? program.goal}`
                        : ""}
                    </p>
                  )}
                </div>
                {isCurrent ? (
                  <span className="shrink-0 text-xs text-muted-foreground">Actual</span>
                ) : savingId === item.id ? (
                  <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" />
                ) : null}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border text-muted-foreground hover:bg-accent",
      )}
    >
      {children}
    </button>
  );
}
