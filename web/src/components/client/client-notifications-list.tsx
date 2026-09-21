"use client";

import * as React from "react";
import {
  Apple,
  Bell,
  BellOff,
  CalendarCheck,
  Repeat,
  Trophy,
  type LucideIcon,
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { formatRelativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { NOTIFICATIONS_READ_EVENT } from "@/components/client/client-profile-menu";
import type { ClientNotification } from "@/lib/types/notifications";

/** Ícono según el tipo de aviso. Los tipos que aún no tienen ícono propio
 * caen en la campana. */
const ICON_BY_TYPE: Record<string, LucideIcon> = {
  routine_assigned: Repeat,
  routine_changed: Repeat,
  program_assigned: CalendarCheck,
  diet_assigned: Apple,
  diet_changed: Apple,
  record: Trophy,
  goal_achieved: Trophy,
};

/** Lista de avisos del cliente: ícono, título y una línea de descripción,
 * sin tarjetas. Al abrirla se marcan todos como leídos. */
export function ClientNotificationsList({
  notifications,
}: {
  notifications: ClientNotification[];
}) {
  // Lo que estaba sin leer al abrir se conserva para poder marcarlo, aunque
  // ya se haya guardado como leído en la base.
  const [unreadIds] = React.useState(
    () => new Set(notifications.filter((n) => !n.read_at).map((n) => n.id)),
  );

  React.useEffect(() => {
    if (unreadIds.size === 0) return;
    void (async () => {
      await createClient()
        .from("client_notifications")
        .update({ read_at: new Date().toISOString() })
        .in("id", [...unreadIds]);
      window.dispatchEvent(new Event(NOTIFICATIONS_READ_EVENT));
    })();
  }, [unreadIds]);

  if (notifications.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-16 text-center text-muted-foreground">
        <BellOff className="size-7" />
        <p className="text-sm">Todavía no tienes notificaciones.</p>
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-6">
      {notifications.map((n) => {
        const Icon = ICON_BY_TYPE[n.type] ?? Bell;
        const isNew = unreadIds.has(n.id);
        return (
          <li key={n.id} className="flex items-start gap-4">
            <Icon className="mt-0.5 size-5 shrink-0 text-primary" />
            <div className="min-w-0 flex-1">
              <p className={cn("text-[15px] leading-snug", isNew ? "font-semibold" : "font-medium")}>
                {n.title}
              </p>
              <p className="mt-0.5 text-sm leading-snug text-muted-foreground">{n.body}</p>
              <p className="mt-1 text-xs text-muted-foreground/80">
                {formatRelativeTime(n.created_at)}
              </p>
            </div>
            {isNew ? (
              <span className="mt-2 size-2 shrink-0 rounded-full bg-primary" aria-label="Nueva" />
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
