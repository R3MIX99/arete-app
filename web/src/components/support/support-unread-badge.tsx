"use client";

import * as React from "react";

import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

/** Punto pulsante que avisa que hay mensajes de soporte sin leer. Se
 * actualiza solo por tiempo real cuando llega una respuesta. */
export function SupportUnreadBadge({ className }: { className?: string }) {
  const supabase = React.useMemo(() => createClient(), []);
  const [count, setCount] = React.useState(0);

  React.useEffect(() => {
    let cancelled = false;

    async function refresh() {
      const { data } = await supabase.from("support_tickets").select("trainer_unread").gt("trainer_unread", 0);
      if (cancelled) return;
      const rows = (data ?? []) as { trainer_unread: number }[];
      setCount(rows.reduce((sum, r) => sum + r.trainer_unread, 0));
    }

    void refresh();
    const channel = supabase
      .channel("support-unread-badge")
      .on("postgres_changes", { event: "*", schema: "public", table: "support_tickets" }, () => {
        void refresh();
      })
      .subscribe();

    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, [supabase]);

  if (count === 0) return null;

  // Solo un punto que pulsa, sin número: avisa que hay respuesta nueva. Se
  // posiciona en la esquina del elemento padre (que debe ser `relative`).
  return (
    <span
      className={cn("pointer-events-none absolute flex size-2.5", className)}
      aria-label="Tienes mensajes nuevos de soporte"
    >
      <span className="absolute inline-flex size-full animate-ping rounded-full bg-destructive opacity-75" />
      <span className="relative inline-flex size-2.5 rounded-full bg-destructive" />
    </span>
  );
}
