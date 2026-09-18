"use client";

import * as React from "react";
import { Loader2, Send } from "lucide-react";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import { formatDateTime } from "@/lib/format";
import type { SupportMessage } from "@/lib/types/support";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

/** Conversación de un ticket de soporte, en tiempo real. La usan el
 * entrenador (viewer "trainer") y el equipo de Aretia (viewer "support").
 * Se monta con `key={ticketId}` para reiniciar al cambiar de conversación. */
export function SupportChat({
  ticketId,
  viewer,
  currentUserId,
  canReply = true,
  disabledReason,
}: {
  ticketId: string;
  viewer: "trainer" | "support";
  currentUserId: string;
  canReply?: boolean;
  disabledReason?: string;
}) {
  const supabase = React.useMemo(() => createClient(), []);
  const [messages, setMessages] = React.useState<SupportMessage[] | null>(null);
  const [text, setText] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const bottomRef = React.useRef<HTMLDivElement>(null);

  const markRead = React.useCallback(() => {
    void supabase.rpc("mark_support_ticket_read", { p_ticket_id: ticketId });
  }, [supabase, ticketId]);

  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      const { data } = await supabase
        .from("support_messages")
        .select("id, ticket_id, author_id, author_role, body, created_at")
        .eq("ticket_id", ticketId)
        .order("created_at");
      if (cancelled) return;
      setMessages((data ?? []) as SupportMessage[]);
      markRead();
    })();

    const channel = supabase
      .channel(`support-messages-${ticketId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "support_messages",
          filter: `ticket_id=eq.${ticketId}`,
        },
        (payload: { new: unknown }) => {
          const incoming = payload.new as SupportMessage;
          setMessages((prev) =>
            !prev || prev.some((m) => m.id === incoming.id) ? prev : [...prev, incoming],
          );
          if (incoming.author_role !== viewer) markRead();
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, [supabase, ticketId, viewer, markRead]);

  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages?.length]);

  async function handleSend() {
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    const { data, error } = await supabase
      .from("support_messages")
      .insert({ ticket_id: ticketId, author_id: currentUserId, author_role: viewer, body })
      .select("id, ticket_id, author_id, author_role, body, created_at")
      .single();
    setSending(false);
    if (error || !data) {
      toast.error("No se pudo enviar el mensaje");
      return;
    }
    setText("");
    setMessages((prev) =>
      prev && !prev.some((m) => m.id === data.id) ? [...prev, data as SupportMessage] : prev,
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {messages === null ? (
          <div className="flex justify-center py-10">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          messages.map((m) => {
            const mine = m.author_role === viewer;
            return (
              <div key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
                <div
                  className={cn(
                    "max-w-[85%] rounded-2xl px-3.5 py-2 text-sm md:max-w-[70%]",
                    mine ? "bg-primary text-primary-foreground" : "bg-muted",
                  )}
                >
                  {!mine ? (
                    <p className="mb-0.5 text-[11px] font-medium opacity-70">
                      {m.author_role === "support" ? "Soporte Aretia" : "Entrenador"}
                    </p>
                  ) : null}
                  <p className="break-words whitespace-pre-wrap">{m.body}</p>
                  <p className="mt-1 text-[10px] opacity-60">{formatDateTime(m.created_at)}</p>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      <div className="border-t p-3">
        {canReply ? (
          <div className="flex items-end gap-2">
            <Textarea
              rows={2}
              maxLength={4000}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void handleSend();
                }
              }}
              placeholder="Escribe un mensaje…"
              className="min-h-0 resize-none"
            />
            <Button
              type="button"
              size="icon"
              aria-label="Enviar"
              disabled={!text.trim() || sending}
              onClick={handleSend}
            >
              {sending ? <Loader2 className="animate-spin" /> : <Send />}
            </Button>
          </div>
        ) : (
          <p className="text-center text-xs text-muted-foreground">{disabledReason}</p>
        )}
      </div>
    </div>
  );
}
