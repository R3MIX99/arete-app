import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import {
  gymRoleLabels,
  type GymInvitation,
  type GymMemberWithProfile,
  type GymRole,
} from "@/lib/types/gyms";
import { TeamManager } from "@/components/trainer/team-manager";

interface MemberRow {
  gym_id: string;
  profile_id: string;
  role: GymRole;
  status: "active" | "invited" | "removed";
  invited_by: string | null;
  joined_at: string | null;
  created_at: string;
  profile: { full_name: string; email: string } | { full_name: string; email: string }[] | null;
}

function one<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export default async function TrainerTeamPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("gym_id")
    .eq("id", user.id)
    .maybeSingle();

  const gymId = profile?.gym_id as string | null;
  if (!gymId) redirect("/entrenador");

  const [{ data: gym }, { data: memberRows }, { data: invitationRows }, { data: memberRow }, { data: seatLimit }, { data: seatUsed }] =
    await Promise.all([
      supabase.from("gyms").select("id, name").eq("id", gymId).maybeSingle(),
      supabase
        .from("gym_members")
        .select("gym_id, profile_id, role, status, invited_by, joined_at, created_at, profile:profile_id(full_name, email)")
        .eq("gym_id", gymId)
        .order("role"),
      supabase
        .from("gym_invitations")
        .select("id, gym_id, token, email, invited_role, status, invited_by, expires_at, created_at, accepted_at")
        .eq("gym_id", gymId)
        .eq("status", "pending")
        .order("created_at", { ascending: false }),
      supabase.from("gym_members").select("role").eq("gym_id", gymId).eq("profile_id", user.id).maybeSingle(),
      supabase.rpc("gym_seat_limit", { p_gym_id: gymId }),
      supabase.rpc("gym_used_seats", { p_gym_id: gymId }),
    ]);

  if (!gym || !memberRow) redirect("/entrenador");

  const myRole = memberRow.role as GymRole;
  const isAdmin = myRole === "admin";
  const isManager = isAdmin || myRole === "supervisor";

  const members: GymMemberWithProfile[] = ((memberRows ?? []) as MemberRow[])
    .filter((m) => m.status === "active")
    .map((m) => {
      const p = one(m.profile);
      return {
        gym_id: m.gym_id,
        profile_id: m.profile_id,
        role: m.role,
        status: m.status,
        invited_by: m.invited_by,
        joined_at: m.joined_at,
        created_at: m.created_at,
        full_name: p?.full_name ?? "—",
        email: p?.email ?? "",
      };
    });

  return (
    <TeamManager
      gymId={gym.id}
      gymName={gym.name}
      myProfileId={user.id}
      myRole={myRole}
      isAdmin={isAdmin}
      isManager={isManager}
      members={members}
      invitations={(invitationRows ?? []) as GymInvitation[]}
      seatLimit={(seatLimit as number | null) ?? null}
      seatUsed={(seatUsed as number | null) ?? 0}
      roleLabels={gymRoleLabels}
    />
  );
}
