"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Copy, Loader2, UserPlus } from "lucide-react";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import { logActivity } from "@/lib/log-activity";
import { gymRoleLabels, type GymRole } from "@/lib/types/gyms";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const ROLE_OPTIONS: GymRole[] = ["trainer", "nutritionist", "supervisor", "assistant", "admin"];

/**
 * "Invitar empleado" — mientras no exista el panel de administrador del
 * propio gimnasio (Fase F), es el superadmin quien manda estas
 * invitaciones por ahora. El insert de gym_invitations valida el cupo de
 * seats directo en la política RLS (gym_invitations_insert_manager), así
 * que este componente solo arma el formulario y muestra el error tal
 * cual venga de la base si no hay cupo.
 */
export function InviteGymMemberDialog({ gymId, gymName }: { gymId: string; gymName: string }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [email, setEmail] = React.useState("");
  const [role, setRole] = React.useState<GymRole>("trainer");
  const [saving, setSaving] = React.useState(false);
  const [inviteLink, setInviteLink] = React.useState<string | null>(null);

  function openDialog() {
    setEmail("");
    setRole("trainer");
    setInviteLink(null);
    setOpen(true);
  }

  async function handleInvite() {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) {
      toast.error("Escribe un correo.");
      return;
    }

    setSaving(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from("gym_invitations")
      .insert({
        gym_id: gymId,
        email: trimmed,
        invited_role: role,
        invited_by: user?.id,
      })
      .select("token")
      .single();
    setSaving(false);

    if (error) {
      toast.error(error.message || "No se pudo crear la invitación.");
      return;
    }

    logActivity({
      action: "superadmin.gym_invitation_created",
      category: "superadmin",
      severity: "success",
      message: `Invitación de equipo creada para ${trimmed} (${gymRoleLabels[role]}) en ${gymName}`,
      targetType: "gym",
      targetId: gymId,
      context: { email: trimmed, role },
    });

    // Todavía no existe el correo automático (Fase G) — se manda el
    // enlace a mano mientras tanto, igual que se hacía al inicio con las
    // invitaciones de cliente.
    setInviteLink(`${window.location.origin}/registro/equipo/${data.token}`);
    router.refresh();
  }

  function copyLink() {
    if (!inviteLink) return;
    navigator.clipboard.writeText(inviteLink);
    toast.success("Enlace copiado.");
  }

  return (
    <>
      <Button size="sm" variant="outline" onClick={openDialog}>
        <UserPlus className="size-3.5" /> Invitar empleado
      </Button>

      <ResponsiveDialog open={open} onOpenChange={setOpen} title="Invitar empleado">
        {inviteLink ? (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">
              Invitación creada. Mándale este enlace — todavía no hay correo automático para esto
              (llega en una fase más adelante del plan Gym).
            </p>
            <div className="flex items-center gap-2 rounded-lg border px-3 py-2.5">
              <p className="flex-1 truncate text-sm">{inviteLink}</p>
              <Button size="sm" variant="outline" onClick={copyLink}>
                <Copy className="size-3.5" /> Copiar
              </Button>
            </div>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cerrar
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="invite_email">Correo</Label>
              <Input
                id="invite_email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="empleado@correo.com"
              />
              <p className="text-xs text-muted-foreground">
                Tiene que registrarse (Google o correo) con este mismo correo — es como se verifica
                que de verdad es la persona invitada.
              </p>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Rol en el gimnasio</Label>
              <Select value={role} onValueChange={(v) => setRole(v as GymRole)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLE_OPTIONS.map((r) => (
                    <SelectItem key={r} value={r}>
                      {gymRoleLabels[r]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button onClick={handleInvite} disabled={saving}>
              {saving ? <Loader2 className="animate-spin" /> : null}
              Crear invitación
            </Button>
          </div>
        )}
      </ResponsiveDialog>
    </>
  );
}
