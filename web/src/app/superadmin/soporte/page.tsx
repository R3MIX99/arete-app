import { createClient } from "@/lib/supabase/server";
import type { SupportTicket } from "@/lib/types/support";
import { SupportTicketsManager } from "@/components/superadmin/support-tickets-manager";

export default async function SuperadminSupportPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("support_tickets")
    .select(
      "id, created_at, user_id, name, email, category, subject, message, status, admin_note, resolved_at",
    )
    .order("created_at", { ascending: false })
    .limit(500);

  return (
    <div className="flex w-full flex-col gap-4 p-4 pb-24 md:p-8">
      <div>
        <h1 className="text-xl font-semibold">Soporte</h1>
        <p className="text-sm text-muted-foreground">
          Mensajes enviados desde la página pública de soporte y desde la app.
        </p>
      </div>
      <SupportTicketsManager tickets={(data ?? []) as SupportTicket[]} />
    </div>
  );
}
