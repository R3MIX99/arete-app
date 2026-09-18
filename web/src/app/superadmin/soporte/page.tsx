import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { SUPPORT_TICKET_COLUMNS, type SupportTicket } from "@/lib/types/support";
import { SupportInbox } from "@/components/superadmin/support-inbox";

export default async function SuperadminSupportPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data } = await supabase
    .from("support_tickets")
    .select(SUPPORT_TICKET_COLUMNS)
    .order("last_message_at", { ascending: false })
    .limit(500);

  return <SupportInbox initialTickets={(data ?? []) as SupportTicket[]} currentUserId={user.id} />;
}
