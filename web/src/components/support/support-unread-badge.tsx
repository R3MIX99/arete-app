"use client";

import * as React from "react";

import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

/** Globito con los mensajes de soporte sin leer del entrenador. Se
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

  return (
    <span
      className={cn(
        "flex min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-semibold text-primary-foreground",
        className,
      )}
    >
      {count > 9 ? "9+" : count}
    </span>
  );
}
