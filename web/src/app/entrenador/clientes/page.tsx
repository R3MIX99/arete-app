import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { fetchClientUsage } from "@/lib/server/client-usage";
import { fetchGymContext } from "@/lib/server/gym-context";
import { ClientsBrowser } from "@/components/trainer/clients-browser";
import type { ClientProfile, PendingInvitation } from "@/lib/types/client";
import type { SubscriptionPlan } from "@/lib/types/settings";

interface ClientRow {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  goal: ClientProfile["goal"];
  health_notes: string | null;
  status: ClientProfile["status"];
  created_at: string;
  trainer_id: string;
  trainer: { full_name: string } | { full_name: string }[] | null;
}

function one<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export default async function ClientsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const gymContext = await fetchGymContext(supabase, user.id);

  const [{ data: clientRows }, { data: invitations }, { data: profile }, usage, teamRows] = await Promise.all([
    supabase
      .from("profiles")
      .select(
        "id, full_name, email, phone, goal, health_notes, status, created_at, trainer_id, trainer:trainer_id(full_name)",
      )
      .eq("role", "client")
      .order("full_name"),
    supabase
      .from("client_invitations")
      .select("id, email, full_name, goal, status, token, created_at")
      .eq("status", "pending")
      .order("created_at", { ascending: false }),
    supabase.from("profiles").select("subscription_plan").eq("id", user.id).single(),
    fetchClientUsage(supabase, user.id),
    gymContext?.isManager
      ? supabase
          .from("gym_members")
          .select("profile_id, profile:profile_id(full_name)")
          .eq("gym_id", gymContext.gymId)
          .eq("status", "active")
      : Promise.resolve({ data: null }),
  ]);

  const clients: ClientProfile[] = ((clientRows ?? []) as ClientRow[]).map((row) => ({
    id: row.id,
    full_name: row.full_name,
    email: row.email,
    phone: row.phone,
    goal: row.goal,
    health_notes: row.health_notes,
    status: row.status,
    created_at: row.created_at,
    trainer_id: row.trainer_id,
    trainer_name: one(row.trainer)?.full_name ?? null,
  }));

  const teamOptions = (
    (teamRows?.data ?? []) as { profile_id: string; profile: { full_name: string } | { full_name: string }[] | null }[]
  ).map((row) => ({ id: row.profile_id, full_name: one(row.profile)?.full_name ?? "—" }));

  return (
    <ClientsBrowser
      clients={clients}
      invitations={(invitations ?? []) as PendingInvitation[]}
      usage={usage}
      planKey={(profile?.subscription_plan as SubscriptionPlan | null) ?? "free"}
      isGymManager={Boolean(gymContext?.isManager)}
      teamOptions={teamOptions}
    />
  );
}
