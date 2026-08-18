"use client";

import { useEffect, useMemo, useState } from "react";
import { Bell, BellOff } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { formatRelativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { ClientNotification } from "@/lib/types/notifications";

/**
 * Campana de notificaciones del cliente: rutina reasignada, plan
 * nutricional actualizado, etc. — se llenan solas vía triggers en la
 * base (ver migración client_notifications), este componente solo lee
 * y marca como leídas. Al abrir el menú se marcan todas como leídas de
 * una vez (no hay vista de detalle por notificación, son avisos
 * cortos), así el numerito no se queda pegado.
 */
export function NotificationBell() {
  const supabase = useMemo(() => createClient(), []);
  const [notifications, setNotifications] = useState<ClientNotification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || cancelled) return;
      const { data } = await supabase
        .from("client_notifications")
        .select("id, type, title, body, read_at, created_at")
        .eq("client_id", user.id)
        .order("created_at", { ascending: false })
        .limit(30);
      if (!cancelled) {
        setNotifications((data ?? []) as ClientNotification[]);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  const unreadCount = notifications.filter((n) => !n.read_at).length;

  async function handleOpenChange(open: boolean) {
    if (!open || unreadCount === 0) return;
    const now = new Date().toISOString();
    const unreadIds = notifications.filter((n) => !n.read_at).map((n) => n.id);
    setNotifications((prev) => prev.map((n) => (n.read_at ? n : { ...n, read_at: now })));
    await supabase.from("client_notifications").update({ read_at: now }).in("id", unreadIds);
  }

  return (
    <DropdownMenu onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger
        aria-label="Notificaciones"
        className="relative flex size-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
      >
        <Bell className="size-5" />
        {unreadCount > 0 ? (
          <span className="absolute top-1 right-1 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        ) : null}
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-80 max-w-[calc(100vw-2rem)] p-0">
        <div className="border-b px-3 py-2.5">
          <p className="text-sm font-semibold">Notificaciones</p>
        </div>
        <div className="flex max-h-96 flex-col overflow-y-auto">
          {loading ? (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">Cargando…</p>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-3 py-8 text-center">
              <BellOff className="size-6 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Todavía no tienes notificaciones.</p>
            </div>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                className={cn(
                  "flex flex-col gap-0.5 border-b px-3 py-2.5 last:border-b-0",
                  !n.read_at && "bg-primary/5",
                )}
              >
                <p className="text-sm font-medium">{n.title}</p>
                <p className="text-xs text-muted-foreground">{n.body}</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {formatRelativeTime(n.created_at)}
                </p>
              </div>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
