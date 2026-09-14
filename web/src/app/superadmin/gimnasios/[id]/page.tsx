import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, UserRound } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { formatDate, formatDateTime } from "@/lib/format";
import { gymInvitationStatusLabels, gymRoleLabels, type GymRole } from "@/lib/types/gyms";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InviteGymMemberDialog } from "@/components/superadmin/invite-gym-member-dialog";
import { RevokeGymInvitationButton } from "@/components/superadmin/revoke-gym-invitation-button";

interface GymRow {
  id: string;
  owner_id: string;
  name: string;
  created_at: string;
}

interface MemberRow {
  gym_id: string;
  profile_id: string;
  role: GymRole;
  status: string;
  joined_at: string | null;
  profile: { full_name: string; email: string } | { full_name: string; email: string }[] | null;
}

interface ClientRow {
  id: string;
  full_name: string;
  email: string;
  status: string;
  trainer_id: string | null;
}

interface InvitationRow {
  id: string;
  email: string;
  invited_role: GymRole;
  status: "pending" | "accepted" | "expired" | "revoked";
  expires_at: string;
  created_at: string;
}

function one<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export default async function SuperadminGymDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: gym }, { data: memberRows }, { data: clientRows }, { data: invitationRows }, { data: seatLimit }, { data: seatUsed }] =
    await Promise.all([
      supabase.from("gyms").select("id, owner_id, name, created_at").eq("id", id).maybeSingle(),
      supabase
        .from("gym_members")
        .select("gym_id, profile_id, role, status, joined_at, profile:profile_id(full_name, email)")
        .eq("gym_id", id)
        .order("role"),
      supabase
        .from("profiles")
        .select("id, full_name, email, status, trainer_id")
        .eq("gym_id", id)
        .eq("role", "client")
        .order("full_name"),
      supabase
        .from("gym_invitations")
        .select("id, email, invited_role, status, expires_at, created_at")
        .eq("gym_id", id)
        .eq("status", "pending")
        .order("created_at", { ascending: false }),
      supabase.rpc("gym_seat_limit", { p_gym_id: id }),
      supabase.rpc("gym_used_seats", { p_gym_id: id }),
    ]);

  if (!gym) notFound();
  const g = gym as GymRow;
  const members = (memberRows ?? []) as MemberRow[];
  const clients = (clientRows ?? []) as ClientRow[];
  const invitations = (invitationRows ?? []) as InvitationRow[];

  return (
    <div className="flex w-full flex-col gap-5 p-4 md:p-8">
      <Link
        href="/superadmin/gimnasios"
        className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" /> Volver a gimnasios
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">{g.name}</h1>
          <p className="text-sm text-muted-foreground">
            Creado el {formatDate(g.created_at.slice(0, 10))}
          </p>
        </div>
        <Badge variant="secondary">Gym</Badge>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card>
          <CardContent className="flex flex-col gap-1">
            <p className="text-2xl font-bold tracking-tight tabular-nums">
              {seatUsed ?? members.length} / {seatLimit ?? "—"}
            </p>
            <p className="text-sm text-muted-foreground">Seats usados</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col gap-1">
            <p className="text-2xl font-bold tracking-tight tabular-nums">{clients.length}</p>
            <p className="text-sm text-muted-foreground">Clientes</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle className="text-sm">Equipo</CardTitle>
          <InviteGymMemberDialog gymId={g.id} gymName={g.name} />
        </CardHeader>
        <CardContent>
          {members.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Este gimnasio todavía no tiene empleados.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {members.map((member) => {
                const profile = one(member.profile);
                return (
                  <div
                    key={member.profile_id}
                    className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {profile?.full_name ?? "—"}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">{profile?.email}</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Badge variant="outline">{gymRoleLabels[member.role]}</Badge>
                      {member.status !== "active" ? (
                        <Badge variant="destructive">{member.status}</Badge>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {invitations.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Invitaciones pendientes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-2">
              {invitations.map((invitation) => (
                <div
                  key={invitation.id}
                  className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{invitation.email}</p>
                    <p className="text-xs text-muted-foreground">
                      {gymRoleLabels[invitation.invited_role]} · vence el{" "}
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
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Clientes del gimnasio</CardTitle>
        </CardHeader>
        <CardContent>
          {clients.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Todavía no hay clientes en la bolsa de este gimnasio.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {clients.map((client) => (
                <Link
                  key={client.id}
                  href={`/superadmin/clientes/${client.id}`}
                  className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5 transition-colors hover:bg-accent/40"
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    <UserRound className="size-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{client.full_name}</p>
                      <p className="truncate text-xs text-muted-foreground">{client.email}</p>
                    </div>
                  </div>
                  <Badge variant={client.status === "active" ? "success" : "destructive"}>
                    {client.status === "active" ? "Activo" : "Inactivo"}
                  </Badge>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
