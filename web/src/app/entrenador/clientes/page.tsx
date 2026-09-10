import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { fetchClientUsage } from "@/lib/server/client-usage";
import { ClientsBrowser } from "@/components/trainer/clients-browser";
import type { ClientProfile, PendingInvitation } from "@/lib/types/client";
import type { SubscriptionPlan } from "@/lib/types/settings";

export default async function ClientsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: clients }, { data: invitations }, { data: profile }, usage] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, email, phone, goal, health_notes, status, created_at")
      .eq("role", "client")
      .order("full_name"),
    supabase
      .from("client_invitations")
      .select("id, email, full_name, goal, status, token, created_at")
      .eq("status", "pending")
      .order("created_at", { ascending: false }),
    supabase.from("profiles").select("subscription_plan").eq("id", user.id).single(),
    fetchClientUsage(supabase, user.id),
  ]);

  return (
    <ClientsBrowser
      clients={(clients ?? []) as ClientProfile[]}
      invitations={(invitations ?? []) as PendingInvitation[]}
      usage={usage}
      planKey={(profile?.subscription_plan as SubscriptionPlan | null) ?? "free"}
    />
  );
}
