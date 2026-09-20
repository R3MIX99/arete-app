"use client";

import * as React from "react";

import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

/** Punto pulsante que avisa que hay mensajes de soporte sin leer. Se
 * actualiza solo por tiempo real cuando llega una respuesta. */
export function SupportUnreadBadge({ className }: { className?: string }) {
  const supabase = React.useMemo(() => createClient(), []);
  const [count, setCount] = React.useState(0);
  const instanceId = React.useId();

  React.useEffect(() => {
    let cancelled = false;

    async function refresh() {
      const { data } = await supabase.from("support_tickets").select("trainer_unread").gt("trainer_unread", 0);
      if (cancelled) return;
      const rows = (data ?? []) as { trainer_unread: number }[];
      setCount(rows.reduce((sum, r) => sum + r.trainer_unread, 0));
    }

    void refresh();
    const onRead = () => void refresh();
    window.addEventListener("support-read", onRead);
    const channel = supabase
      // Nombre único por instancia: el menú de escritorio y el de móvil pueden
      // estar montados a la vez, y reusar un canal ya suscrito lanza error.
      .channel(`support-unread-badge-${instanceId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "support_tickets" }, () => {
        void refresh();
      })
      .subscribe();

    return () => {
      cancelled = true;
      window.removeEventListener("support-read", onRead);
      void supabase.removeChannel(channel);
    };
  }, [supabase, instanceId]);

  if (count === 0) return null;

  // Solo un punto que pulsa, sin número: avisa que hay respuesta nueva. Se
  // posiciona en la esquina del elemento padre (que debe ser `relative`).
  return (
    <span
      className={cn("pointer-events-none absolute flex size-2", className)}
      aria-label="Tienes mensajes nuevos de soporte"
    >
      <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-75" />
      <span className="relative inline-flex size-2 rounded-full bg-primary" />
    </span>
  );
}
