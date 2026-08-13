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
 * Diálogo reutilizable para asignar un programa completo o una rutina
 * suelta a varios clientes a la vez — una fila por cliente en
 * `client_assignments`, con `program_id` xor `routine_id`.
 */
export function AssignToClientsDialog({
  open,
  onOpenChange,
  trainerId,
  clients,
  alreadyAssignedClientIds,
  programId,
  routineId,
  onAssigned,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trainerId: string;
  clients: ClientProfile[];
  alreadyAssignedClientIds: string[];
  programId?: string;
  routineId?: string;
  onAssigned: () => void;
}) {
  const [query, setQuery] = React.useState("");
  const [startDate, setStartDate] = React.useState(todayIso());
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setQuery("");
      setStartDate(todayIso());
      setSelected(new Set());
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

  async function handleSubmit() {
    if (selected.size === 0) return;
    setSaving(true);

    const supabase = createClient();
    const rows = Array.from(selected).map((clientId) => ({
      trainer_id: trainerId,
      client_id: clientId,
      program_id: programId ?? null,
      routine_id: routineId ?? null,
      start_date: startDate,
    }));

    const { error, count } = await supabase
      .from("client_assignments")
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Asignar a clientes</DialogTitle>
          <DialogDescription>
            Elige la fecha de inicio y los clientes que recibirán esto.
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

          <Button type="button" disabled={saving || selected.size === 0} onClick={handleSubmit}>
            {saving ? <Loader2 className="animate-spin" /> : null}
            Asignar a {selected.size} {selected.size === 1 ? "cliente" : "clientes"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
