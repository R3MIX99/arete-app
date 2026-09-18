"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, Search, UserCheck, UserX, Users } from "lucide-react";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import { logActivity } from "@/lib/log-activity";
import { formatDate, formatDateTime, initialsOf } from "@/lib/format";
import { gymInvitationStatusLabels, type GymInvitation, type GymMemberWithProfile, type GymRole } from "@/lib/types/gyms";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { InviteGymMemberDialog } from "@/components/superadmin/invite-gym-member-dialog";
import { RevokeGymInvitationButton } from "@/components/superadmin/revoke-gym-invitation-button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const ROLE_OPTIONS: GymRole[] = ["admin", "supervisor", "trainer", "nutritionist", "assistant"];
const ROLE_FILTERS: Array<{ value: GymRole | "all"; label: string }> = [
  { value: "all", label: "Todos" },
  { value: "admin", label: "Administrador" },
  { value: "supervisor", label: "Supervisor" },
  { value: "trainer", label: "Entrenador" },
  { value: "nutritionist", label: "Nutriólogo" },
  { value: "assistant", label: "Asistente" },
];

export interface AssignedClient {
  id: string;
  full_name: string;
}

/**
 * Panel de "Equipo" del gimnasio (Fase F), dentro del dashboard normal
 * del entrenador. Todo el mundo en el gimnasio ve el roster completo
 * (decisión #4 — hasta el asistente ve todo en modo lectura); solo el
 * admin puede invitar, cambiar roles y activar/desactivar gente
 * (matriz D3). Tabla con búsqueda + filtro de rol + pestañas de
 * estatus, cada fila se puede expandir para ver sus clientes
 * asignados sin salir de la pantalla.
 */
export function TeamManager({
  gymId,
  gymName,
  myProfileId,
  isAdmin,
  isManager,
  members,
  assignedClientsByMember,
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
  assignedClientsByMember: Record<string, AssignedClient[]>;
  invitations: GymInvitation[];
  seatLimit: number | null;
  seatUsed: number;
  roleLabels: Record<GymRole, string>;
}) {
  const router = useRouter();
  const [changingId, setChangingId] = React.useState<string | null>(null);
  const [togglingId, setTogglingId] = React.useState<string | null>(null);
  const [expandedId, setExpandedId] = React.useState<string | null>(null);
  const [query, setQuery] = React.useState("");
  const [roleFilter, setRoleFilter] = React.useState<GymRole | "all">("all");
  const [statusTab, setStatusTab] = React.useState<"active" | "removed">("active");

  const activeCount = members.filter((m) => m.status === "active").length;
  const inactiveCount = members.filter((m) => m.status === "removed").length;

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return members.filter((m) => {
      if (m.status !== statusTab) return false;
      if (roleFilter !== "all" && m.role !== roleFilter) return false;
      if (q && !m.full_name.toLowerCase().includes(q) && !m.email.toLowerCase().includes(q)) {
        return false;
      }
      return true;
    });
  }, [members, query, roleFilter, statusTab]);

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

  async function handleToggleStatus(member: GymMemberWithProfile) {
    const nextStatus = member.status === "active" ? "removed" : "active";
    setTogglingId(member.profile_id);
    const supabase = createClient();
    const { error } = await supabase
      .from("gym_members")
      .update({ status: nextStatus })
      .eq("gym_id", gymId)
      .eq("profile_id", member.profile_id);
    setTogglingId(null);

    if (error) {
      toast.error(error.message || "No se pudo actualizar.");
      return;
    }

    logActivity({
      action:
        nextStatus === "removed" ? "trainer.gym_member_removed" : "trainer.gym_member_reactivated",
      category: "trainer",
      severity: nextStatus === "removed" ? "warning" : "success",
      message: `${member.full_name} ${nextStatus === "removed" ? "desactivado" : "reactivado"} en el equipo`,
      targetType: "gym_member",
      targetId: member.profile_id,
      context: { gymId },
    });

    toast.success(nextStatus === "removed" ? "Empleado desactivado." : "Empleado reactivado.");
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

      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Pestañas de estatus: mismo patrón que activos/inactivos de
           * clientes, para no inventar otro lenguaje visual. */}
          <div className="flex items-center gap-1 rounded-lg bg-foreground/[0.04] p-1">
            <button
              type="button"
              onClick={() => setStatusTab("active")}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                statusTab === "active"
                  ? "bg-background shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              Activos · {activeCount}
            </button>
            <button
              type="button"
              onClick={() => setStatusTab("removed")}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                statusTab === "removed"
                  ? "bg-background shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              Inactivos · {inactiveCount}
            </button>
          </div>

          <div className="relative w-full max-w-xs">
            <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por nombre o correo"
              className="pl-8"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {ROLE_FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setRoleFilter(f.value)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                roleFilter === f.value
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border/80 text-muted-foreground hover:border-primary/40 hover:text-foreground",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-foreground/[0.02] text-left text-xs text-muted-foreground uppercase">
                <th className="px-3 py-2 font-medium">Miembro</th>
                <th className="px-3 py-2 font-medium">Rol</th>
                <th className="px-3 py-2 font-medium">Clientes</th>
                <th className="px-3 py-2 font-medium">Estatus</th>
                <th className="px-3 py-2 font-medium">Desde</th>
                {isAdmin ? <th className="w-16 px-3 py-2" /> : null}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={isAdmin ? 6 : 5}
                    className="px-3 py-10 text-center text-sm text-muted-foreground"
                  >
                    Nadie coincide con la búsqueda o los filtros.
                  </td>
                </tr>
              ) : (
                filtered.map((member) => {
                  const isSelf = member.profile_id === myProfileId;
                  const clients = assignedClientsByMember[member.profile_id] ?? [];
                  const expanded = expandedId === member.profile_id;
                  return (
                    <React.Fragment key={member.profile_id}>
                      <tr
                        className="cursor-pointer border-b last:border-b-0 hover:bg-foreground/[0.02]"
                        onClick={() => setExpandedId(expanded ? null : member.profile_id)}
                      >
                        <td className="px-3 py-2.5">
                          <div className="flex min-w-0 items-center gap-2.5">
                            <Avatar className="size-8 shrink-0">
                              <AvatarFallback>{initialsOf(member.full_name)}</AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <p className="truncate font-medium">
                                {member.full_name}
                                {isSelf ? <span className="text-muted-foreground"> (tú)</span> : null}
                              </p>
                              <p className="truncate text-xs text-muted-foreground">{member.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                          {isAdmin && !isSelf ? (
                            <Select
                              value={member.role}
                              onValueChange={(v) => handleRoleChange(member.profile_id, v as GymRole)}
                              disabled={changingId === member.profile_id}
                            >
                              <SelectTrigger className="h-8 w-[150px] text-xs">
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
                          ) : (
                            <Badge variant="outline">{roleLabels[member.role]}</Badge>
                          )}
                        </td>
                        <td className="px-3 py-2.5">
                          <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                            <Users className="size-3.5" />
                            {clients.length}
                            {clients.length > 0 ? (
                              <ChevronDown
                                className={cn(
                                  "size-3.5 transition-transform",
                                  expanded ? "rotate-180" : "",
                                )}
                              />
                            ) : null}
                          </span>
                        </td>
                        <td className="px-3 py-2.5">
                          <Badge variant={member.status === "active" ? "success" : "destructive"}>
                            {member.status === "active" ? "Activo" : "Inactivo"}
                          </Badge>
                        </td>
                        <td className="px-3 py-2.5 whitespace-nowrap text-muted-foreground">
                          {member.joined_at ? formatDate(member.joined_at.slice(0, 10)) : "—"}
                        </td>
                        {isAdmin ? (
                          <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                            {!isSelf ? (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    aria-label={member.status === "active" ? "Desactivar" : "Reactivar"}
                                    disabled={togglingId === member.profile_id}
                                    onClick={() => handleToggleStatus(member)}
                                    className={
                                      member.status === "active"
                                        ? "text-destructive hover:text-destructive"
                                        : "text-success hover:text-success"
                                    }
                                  >
                                    {member.status === "active" ? (
                                      <UserX className="size-4" />
                                    ) : (
                                      <UserCheck className="size-4" />
                                    )}
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent side="top">
                                  {member.status === "active"
                                    ? "Desactivar — deja de verse en el equipo, puedes reactivarlo cuando quieras"
                                    : "Reactivar — vuelve a estar activo en el equipo"}
                                </TooltipContent>
                              </Tooltip>
                            ) : null}
                          </td>
                        ) : null}
                      </tr>
                      {expanded && clients.length > 0 ? (
                        <tr className="border-b bg-foreground/[0.015] last:border-b-0">
                          <td colSpan={isAdmin ? 6 : 5} className="px-3 py-3">
                            <p className="mb-2 text-xs font-medium text-muted-foreground uppercase">
                              Clientes asignados
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                              {clients.map((client) => (
                                <Link
                                  key={client.id}
                                  href={`/entrenador/clientes/${client.id}`}
                                  className="rounded-full border border-border/80 px-2.5 py-1 text-xs hover:border-primary/50 hover:text-primary"
                                >
                                  {client.full_name}
                                </Link>
                              ))}
                            </div>
                          </td>
                        </tr>
                      ) : null}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {!isManager ? (
          <p className="text-xs text-muted-foreground">
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
