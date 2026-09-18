import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import {
  SUPPORT_TICKET_COLUMNS,
  supportCategoryLabels,
  supportStatusLabels,
  type SupportTicket,
} from "@/lib/types/support";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SupportChat } from "@/components/support/support-chat";

export default async function TrainerSupportTicketPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data } = await supabase
    .from("support_tickets")
    .select(SUPPORT_TICKET_COLUMNS)
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!data) notFound();
  const ticket = data as SupportTicket;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 p-4 md:p-8">
      <Button variant="ghost" size="sm" className="w-fit" asChild>
        <Link href="/entrenador/soporte">
          <ArrowLeft /> Volver a soporte
        </Link>
      </Button>

      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-lg font-semibold">
          #{ticket.ticket_number} · {ticket.subject}
        </h1>
        <Badge variant="outline">{supportCategoryLabels[ticket.category]}</Badge>
        <Badge variant={ticket.status === "resolved" ? "outline" : "secondary"}>
          {supportStatusLabels[ticket.status]}
        </Badge>
      </div>

      <div className="h-[calc(100dvh-16rem)] min-h-[24rem] overflow-hidden rounded-xl border">
        <SupportChat ticketId={ticket.id} viewer="trainer" currentUserId={user.id} />
      </div>
      {ticket.status === "resolved" ? (
        <p className="text-center text-xs text-muted-foreground">
          Esta conversación está resuelta. Si escribes de nuevo, se reabre.
        </p>
      ) : null}
    </div>
  );
}
