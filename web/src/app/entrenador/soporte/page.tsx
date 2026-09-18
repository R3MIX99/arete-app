import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { SUPPORT_TICKET_COLUMNS, type SupportTicket } from "@/lib/types/support";
import { SupportCenter } from "@/components/support/support-center";

export default async function TrainerSupportPage({
  searchParams,
}: {
  searchParams: Promise<{ vista?: string }>;
}) {
  const { vista } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: profile }, { data: tickets }] = await Promise.all([
    supabase.from("profiles").select("full_name, email").eq("id", user.id).maybeSingle(),
    supabase
      .from("support_tickets")
      .select(SUPPORT_TICKET_COLUMNS)
      .eq("user_id", user.id)
      .order("last_message_at", { ascending: false }),
  ]);

  return (
    <SupportCenter
      tickets={(tickets ?? []) as SupportTicket[]}
      initialView={vista === "tickets" ? "tickets" : "help"}
      profile={{ id: user.id, full_name: profile?.full_name ?? "", email: profile?.email ?? "" }}
    />
  );
}
