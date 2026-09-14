"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import { logActivity } from "@/lib/log-activity";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface TrainerOption {
  id: string;
  full_name: string;
  email: string;
}

/**
 * "Crear gimnasio" — único camino de alta mientras no exista el pago con
 * Stripe (Fase H): el superadmin elige a un entrenador ya registrado
 * como dueño/administrador y le pone nombre al gimnasio. Todo pasa por
 * superadmin_create_gym(), que crea la fila en gyms, mete al dueño como
 * admin en gym_members, le pone gym_id, y le asigna el plan Gym.
 */
export function CreateGymDialog({ trainerOptions }: { trainerOptions: TrainerOption[] }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [ownerId, setOwnerId] = React.useState("");
  const [name, setName] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  function openDialog() {
    setOwnerId("");
    setName("");
    setOpen(true);
  }

  async function handleCreate() {
    if (!ownerId || !name.trim()) {
      toast.error("Elige un dueño y ponle nombre al gimnasio.");
      return;
    }

    setSaving(true);
    const supabase = createClient();
    const { data, error } = await supabase.rpc("superadmin_create_gym", {
      p_owner_id: ownerId,
      p_name: name.trim(),
    });
    setSaving(false);

    if (error) {
      toast.error(error.message || "No se pudo crear el gimnasio.");
      return;
    }

    const owner = trainerOptions.find((t) => t.id === ownerId);
    logActivity({
      action: "superadmin.gym_created",
      category: "superadmin",
      severity: "success",
      message: `Gimnasio creado: ${name.trim()}`,
      targetType: "gym",
      targetId: data as string,
      context: { name: name.trim(), ownerId, ownerName: owner?.full_name ?? null },
    });

    toast.success("Gimnasio creado.");
    setOpen(false);
    router.push(`/superadmin/gimnasios/${data}`);
  }

  return (
    <>
      <Button size="sm" onClick={openDialog}>
        <Plus className="size-3.5" /> Crear gimnasio
      </Button>

      <ResponsiveDialog open={open} onOpenChange={setOpen} title="Crear gimnasio">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>Entrenador dueño / administrador</Label>
            <Select value={ownerId} onValueChange={setOwnerId}>
              <SelectTrigger>
                <SelectValue placeholder="Elige un entrenador" />
              </SelectTrigger>
              <SelectContent>
                {trainerOptions.length === 0 ? (
                  <div className="px-3 py-2 text-sm text-muted-foreground">
                    No hay entrenadores disponibles (sin gimnasio ya asignado).
                  </div>
                ) : (
                  trainerOptions.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.full_name} — {t.email}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Tiene que ser un entrenador ya registrado en la plataforma. Se le asigna el plan Gym y
              queda como administrador.
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="gym_name">Nombre del gimnasio</Label>
            <Input
              id="gym_name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Be Wellness"
            />
          </div>

          <Button onClick={handleCreate} disabled={saving}>
            {saving ? <Loader2 className="animate-spin" /> : null}
            Crear gimnasio
          </Button>
        </div>
      </ResponsiveDialog>
    </>
  );
}
