"use client";

import * as React from "react";
import { ArrowLeft, Headset, Loader2, Mail, Search } from "lucide-react";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import { formatDate, initialsOf } from "@/lib/format";
import {
  supportCategoryLabels,
  supportStatusLabels,
  type SupportStatus,
  type SupportTicket,
} from "@/lib/types/support";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SupportChat } from "@/components/support/support-chat";

type Filter = "all" | "unread" | "active" | "resolved";

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "Todas" },
  { value: "unread", label: "Sin leer" },
  { value: "active", label: "Abiertas" },
  { value: "resolved", label: "Resueltas" },
];

function relativeTime(iso: string): string {
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutes < 1) return "ahora";
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days} d`;
  return formatDate(iso.slice(0, 10));
}

function sortTickets(list: SupportTicket[]): SupportTicket[] {
  return [...list].sort((a, b) => b.last_message_at.localeCompare(a.last_message_at));
}

function TicketDetails({
  ticket,
  currentUserId,
  onBack,
  onUpdated,
}: {
  ticket: SupportTicket;
  currentUserId: string;
  onBack: () => void;
  onUpdated: (patch: Partial<SupportTicket>) => void;
}) {
  const supabase = React.useMemo(() => createClient(), []);
  const [note, setNote] = React.useState(ticket.admin_note ?? "");
  const [savingNote, setSavingNote] = React.useState(false);

  async function handleStatusChange(next: SupportStatus) {
    const resolvedAt = next === "resolved" ? new Date().toISOString() : null;
    const { error } = await supabase
      .from("support_tickets")
      .update({ status: next, resolved_at: resolvedAt })
      .eq("id", ticket.id);
    if (error) {
      toast.error("No se pudo cambiar el estado");
      return;
    }
    onUpdated({ status: next, resolved_at: resolvedAt });
  }

  async function handleSaveNote() {
    setSavingNote(true);
    const { error } = await supabase
      .from("support_tickets")
      .update({ admin_note: note.trim() || null })
      .eq("id", ticket.id);
    setSavingNote(false);
    if (error) {
      toast.error("No se pudo guardar la nota");
      return;
    }
    onUpdated({ admin_note: note.trim() || null });
    toast.success("Nota guardada");
  }

  const hasAccount = Boolean(ticket.user_id);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex flex-wrap items-center gap-3 border-b px-4 py-3">
        <Button variant="ghost" size="icon" className="md:hidden" aria-label="Volver" onClick={onBack}>
          <ArrowLeft />
        </Button>
        <Avatar className="size-9">
          <AvatarFallback className="text-xs">{initialsOf(ticket.name) || "?"}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">
            {ticket.name} <span className="font-normal text-muted-foreground">· #{ticket.ticket_number}</span>
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {ticket.email} · {supportCategoryLabels[ticket.category]}
          </p>
        </div>
        {!hasAccount ? (
          <Button variant="outline" size="sm" asChild>
            <a
              href={`mailto:${ticket.email}?subject=${encodeURIComponent(`Re: ${ticket.subject}`)}`}
            >
              <Mail /> Responder por correo
            </a>
          </Button>
        ) : null}
        <Select value={ticket.status} onValueChange={(v) => handleStatusChange(v as SupportStatus)}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(supportStatusLabels).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="border-b px-4 py-2">
        <p className="truncate text-sm font-medium">{ticket.subject}</p>
        <details className="text-xs text-muted-foreground">
          <summary className="cursor-pointer">Nota interna</summary>
          <div className="mt-2 flex flex-col gap-2">
            <Textarea
              rows={2}
              maxLength={2000}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Solo la ve el equipo de soporte"
            />
            <Button
              size="sm"
              className="w-fit"
              disabled={savingNote || note === (ticket.admin_note ?? "")}
              onClick={handleSaveNote}
            >
              {savingNote ? <Loader2 className="animate-spin" /> : null}
              Guardar nota
            </Button>
          </div>
        </details>
      </div>

      <div className="min-h-0 flex-1">
        <SupportChat
          key={ticket.id}
          ticketId={ticket.id}
          viewer="support"
          currentUserId={currentUserId}
          canReply={hasAccount}
          disabledReason="Este mensaje se envió sin iniciar sesión: respóndelo por correo."
        />
      </div>
    </div>
  );
}

export function SupportInbox({
  initialTickets,
  currentUserId,
}: {
  initialTickets: SupportTicket[];
  currentUserId: string;
}) {
  const supabase = React.useMemo(() => createClient(), []);
  const [tickets, setTickets] = React.useState(initialTickets);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [filter, setFilter] = React.useState<Filter>("all");
  const [query, setQuery] = React.useState("");

  React.useEffect(() => {
    const channel = supabase
      .channel("support-tickets-inbox")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "support_tickets" },
        (payload: { eventType: string; new: unknown; old: unknown }) => {
          if (payload.eventType === "DELETE") {
            const oldRow = payload.old as { id: string };
            setTickets((prev) => prev.filter((t) => t.id !== oldRow.id));
            return;
          }
          const row = payload.new as SupportTicket;
          setTickets((prev) =>
            sortTickets(prev.some((t) => t.id === row.id) ? prev.map((t) => (t.id === row.id ? row : t)) : [...prev, row]),
          );
        },
      )
      .subscribe();
    const onRead = (event: Event) => {
      const { ticketId } = (event as CustomEvent<{ ticketId: string }>).detail;
      setTickets((prev) => prev.map((t) => (t.id === ticketId ? { ...t, admin_unread: 0 } : t)));
    };
    window.addEventListener("support-read", onRead);
    return () => {
      window.removeEventListener("support-read", onRead);
      void supabase.removeChannel(channel);
    };
  }, [supabase]);

  const counts = React.useMemo(
    () => ({
      all: tickets.length,
      unread: tickets.filter((t) => t.admin_unread > 0).length,
      active: tickets.filter((t) => t.status !== "resolved").length,
      resolved: tickets.filter((t) => t.status === "resolved").length,
    }),
    [tickets],
  );

  const visible = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return tickets.filter((t) => {
      if (filter === "unread" && t.admin_unread === 0) return false;
      if (filter === "active" && t.status === "resolved") return false;
      if (filter === "resolved" && t.status !== "resolved") return false;
      if (q && !`${t.name} ${t.email} ${t.subject}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [tickets, filter, query]);

  const selected = tickets.find((t) => t.id === selectedId) ?? null;

  return (
    <div className="grid h-[calc(100dvh-3.5rem)] grid-cols-1 md:grid-cols-[22rem_1fr]">
      <div className={cn("flex min-h-0 flex-col border-r", selected && "hidden md:flex")}>
        <div className="flex flex-col gap-3 border-b p-4">
          <h1 className="flex items-center gap-2 text-lg font-semibold">
            Conversaciones
            <span className="text-sm font-normal text-muted-foreground">{tickets.length}</span>
          </h1>
          <div className="relative">
            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar entrenador…"
              className="pl-9"
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {FILTERS.map((f) => (
              <button
                key={f.value}
                type="button"
                onClick={() => setFilter(f.value)}
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                  filter === f.value
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:text-foreground",
                )}
              >
                {f.label} ({counts[f.value]})
              </button>
            ))}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {visible.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">No hay conversaciones.</p>
          ) : (
            visible.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setSelectedId(t.id)}
                className={cn(
                  "flex w-full items-center gap-3 border-b px-4 py-3 text-left transition-colors hover:bg-foreground/[0.03]",
                  t.id === selectedId && "bg-foreground/[0.05]",
                )}
              >
                <Avatar className="size-10 shrink-0">
                  <AvatarFallback className="text-xs">{initialsOf(t.name) || "?"}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className={cn("truncate text-sm", t.admin_unread > 0 ? "font-semibold" : "font-medium")}>
                      {t.name}
                    </p>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {relativeTime(t.last_message_at)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="min-w-0 flex-1 truncate text-xs text-muted-foreground">{t.subject}</p>
                    {t.admin_unread > 0 ? (
                      <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] text-primary-foreground">
                        {t.admin_unread}
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-1 flex gap-1.5">
                    <Badge variant={t.status === "resolved" ? "outline" : "secondary"} className="text-[10px]">
                      {supportStatusLabels[t.status]}
                    </Badge>
                    {!t.user_id ? (
                      <Badge variant="outline" className="text-[10px]">
                        Sin cuenta
                      </Badge>
                    ) : null}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      <div className={cn("min-h-0", !selected && "hidden md:block")}>
        {selected ? (
          <TicketDetails
            key={selected.id}
            ticket={selected}
            currentUserId={currentUserId}
            onBack={() => setSelectedId(null)}
            onUpdated={(patch) =>
              setTickets((prev) => prev.map((t) => (t.id === selected.id ? { ...t, ...patch } : t)))
            }
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground">
            <Headset className="size-8" />
            <p className="text-sm">Elige una conversación para responder.</p>
          </div>
        )}
      </div>
    </div>
  );
}
