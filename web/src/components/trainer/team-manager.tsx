"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { UserMinus } from "lucide-react";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import { logActivity } from "@/lib/log-activity";
import { formatDateTime, initialsOf } from "@/lib/format";
import { gymInvitationStatusLabels, type GymInvitation, type GymMemberWithProfile, type GymRole } from "@/lib/types/gyms";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { InviteGymMemberDialog } from "@/components/superadmin/invite-gym-member-dialog";
import { RevokeGymInvitationButton } from "@/components/superadmin/revoke-gym-invitation-button";

const ROLE_OPTIONS: GymRole[] = ["admin", "supervisor", "trainer", "nutritionist", "assistant"];

/**
 * Panel de "Equipo" del gimnasio (Fase F), dentro del dashboard normal
 * del entrenador. Todo el mundo en el gimnasio ve el roster completo
 * (decisión #4 — hasta el asistente ve todo en modo lectura); solo el
 * admin puede invitar, cambiar roles y quitar gente (matriz D3).
 *
 * Sin tarjetas anidadas a propósito — listas con separador en vez de
 * cajas dentro de cajas (dirección de diseño actual del sitio).
 */
export function TeamManager({
  gymId,
  gymName,
  myProfileId,
  isAdmin,
  isManager,
  members,
  invitations,
  seatLimit,
  seatUsed,
  roleLabels,
}: {
  gymId: string;
  gymName: string;
  myProfileId: string;
  myRole: GymRole;
  isAdmin: boolean;
  isManager: boolean;
  members: GymMemberWithProfile[];
  invitations: GymInvitation[];
  seatLimit: number | null;
  seatUsed: number;
  roleLabels: Record<GymRole, string>;
}) {
  const router = useRouter();
  const [changingId, setChangingId] = React.useState<string | null>(null);
  const [removingId, setRemovingId] = React.useState<string | null>(null);

  async function handleRoleChange(profileId: string, newRole: GymRole) {
    setChangingId(profileId);
    const supabase = createClient();
    const { error } = await supabase
      .from("gym_members")
      .update({ role: newRole })
      .eq("gym_id", gymId)
      .eq("profile_id", profileId);
    setChangingId(null);

    if (error) {
      toast.error(error.message || "No se pudo cambiar el rol.");
      return;
    }

    const member = members.find((m) => m.profile_id === profileId);
    logActivity({
      action: "trainer.gym_member_role_changed",
      category: "trainer",
      severity: "success",
      message: `Rol cambiado a ${roleLabels[newRole]} para ${member?.full_name ?? profileId}`,
      targetType: "gym_member",
      targetId: profileId,
      context: { gymId, newRole, previousRole: member?.role },
    });

    toast.success("Rol actualizado.");
    router.refresh();
  }

  async function handleRemove(profileId: string) {
    setRemovingId(profileId);
    const supabase = createClient();
    const { error } = await supabase
      .from("gym_members")
      .update({ status: "removed" })
      .eq("gym_id", gymId)
      .eq("profile_id", profileId);
    setRemovingId(null);

    if (error) {
      toast.error(error.message || "No se pudo quitar del equipo.");
      return;
    }

    const member = members.find((m) => m.profile_id === profileId);
    logActivity({
      action: "trainer.gym_member_removed",
      category: "trainer",
      severity: "warning",
      message: `${member?.full_name ?? profileId} salió del equipo`,
      targetType: "gym_member",
      targetId: profileId,
      context: { gymId },
    });

    toast.success("Empleado quitado del equipo.");
    router.refresh();
  }

  return (
    <div className="flex w-full flex-col gap-8 p-4 md:p-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Equipo</h1>
          <p className="text-sm text-muted-foreground">
            {gymName} · {seatUsed} / {seatLimit ?? "—"} seats usados
          </p>
        </div>
        {isAdmin ? <InviteGymMemberDialog gymId={gymId} gymName={gymName} /> : null}
      </div>

      <div>
        <h2 className="mb-3 text-sm font-medium text-muted-foreground">Miembros del equipo</h2>
        <div className="flex flex-col divide-y divide-border">
          {members.map((member) => {
            const isSelf = member.profile_id === myProfileId;
            return (
              <div
                key={member.profile_id}
                className="flex flex-wrap items-center justify-between gap-3 py-3"
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <Avatar className="size-8">
                    <AvatarFallback>{initialsOf(member.full_name)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {member.full_name}
                      {isSelf ? <span className="text-muted-foreground"> (tú)</span> : null}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">{member.email}</p>
                  </div>
                </div>

                {isAdmin && !isSelf ? (
                  <div className="flex items-center gap-1.5">
                    <Select
                      value={member.role}
                      onValueChange={(v) => handleRoleChange(member.profile_id, v as GymRole)}
                      disabled={changingId === member.profile_id}
                    >
                      <SelectTrigger className="h-8 w-[160px] text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ROLE_OPTIONS.map((r) => (
                          <SelectItem key={r} value={r}>
                            {roleLabels[r]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleRemove(member.profile_id)}
                      disabled={removingId === member.profile_id}
                    >
                      <UserMinus className="size-3.5" />
                    </Button>
                  </div>
                ) : (
                  <Badge variant="outline">
                    {roleLabels[member.role]}
                    {isSelf && isAdmin ? " · tú" : ""}
                  </Badge>
                )}
              </div>
            );
          })}
        </div>
        {isAdmin ? (
          <p className="mt-3 text-xs text-muted-foreground">
            No puedes cambiar tu propio rol ni quitarte del equipo — pídele a otro administrador que
            lo haga, o transfiere el rol de administrador a alguien más primero.
          </p>
        ) : !isManager ? (
          <p className="mt-3 text-xs text-muted-foreground">
            Ves a todo el equipo en modo lectura — invitar, cambiar roles y reasignar clientes lo
            maneja el administrador.
          </p>
        ) : null}
      </div>

      {isAdmin && invitations.length > 0 ? (
        <div>
          <h2 className="mb-3 text-sm font-medium text-muted-foreground">Invitaciones pendientes</h2>
          <div className="flex flex-col divide-y divide-border">
            {invitations.map((invitation) => (
              <div
                key={invitation.id}
                className="flex flex-wrap items-center justify-between gap-3 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{invitation.email}</p>
                  <p className="text-xs text-muted-foreground">
                    {roleLabels[invitation.invited_role]} · vence el{" "}
                    {formatDateTime(invitation.expires_at)}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <Badge variant="outline">{gymInvitationStatusLabels[invitation.status]}</Badge>
                  <RevokeGymInvitationButton invitationId={invitation.id} />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
