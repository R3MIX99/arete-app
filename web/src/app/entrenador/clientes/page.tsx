import { createClient } from "@/lib/supabase/server";
import { ClientsBrowser } from "@/components/trainer/clients-browser";
import type { ClientProfile, PendingInvitation } from "@/lib/types/client";

export default async function ClientsPage() {
  const supabase = await createClient();

  const [{ data: clients }, { data: invitations }] = await Promise.all([
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
  ]);

  return (
    <ClientsBrowser
      clients={(clients ?? []) as ClientProfile[]}
      invitations={(invitations ?? []) as PendingInvitation[]}
    />
  );
}
