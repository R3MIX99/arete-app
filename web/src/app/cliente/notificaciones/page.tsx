import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { ClientNotificationsList } from "@/components/client/client-notifications-list";
import type { ClientNotification } from "@/lib/types/notifications";

export default async function ClientNotificationsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data } = await supabase
    .from("client_notifications")
    .select("id, type, title, body, read_at, created_at")
    .eq("client_id", user.id)
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <div className="mx-auto flex max-w-md flex-col gap-6 px-5 pb-6">
      <div className="flex items-center gap-2">
        <Link
          href="/cliente"
          aria-label="Volver al inicio"
          className="-ml-2 flex size-9 items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <ChevronLeft className="size-5" />
        </Link>
        <h1 className="text-2xl font-semibold">Notificaciones</h1>
      </div>
      <ClientNotificationsList notifications={(data ?? []) as ClientNotification[]} />
    </div>
  );
}
