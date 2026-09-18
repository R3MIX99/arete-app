"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Loader2, Mail } from "lucide-react";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import { formatDateTime } from "@/lib/format";
import {
  supportCategoryLabels,
  supportStatusLabels,
  type SupportStatus,
  type SupportTicket,
} from "@/lib/types/support";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Filter = "all" | SupportStatus;

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "open", label: "Abiertos" },
  { value: "in_progress", label: "En proceso" },
  { value: "resolved", label: "Resueltos" },
];

const statusVariant: Record<SupportStatus, "default" | "secondary" | "outline"> = {
  open: "default",
  in_progress: "secondary",
  resolved: "outline",
};

function TicketRow({ ticket }: { ticket: SupportTicket }) {
  const router = useRouter();
  const [expanded, setExpanded] = React.useState(false);
  const [status, setStatus] = React.useState<SupportStatus>(ticket.status);
  const [note, setNote] = React.useState(ticket.admin_note ?? "");
  const [saving, setSaving] = React.useState(false);

  const dirty = status !== ticket.status || note !== (ticket.admin_note ?? "");

  async function handleSave() {
    setSaving(true);
    const { error } = await createClient()
      .from("support_tickets")
      .update({
        status,
        admin_note: note.trim() || null,
        resolved_at: status === "resolved" ? new Date().toISOString() : null,
      })
      .eq("id", ticket.id);
    setSaving(false);
    if (error) {
      toast.error("No se pudo guardar");
      return;
    }
    toast.success("Ticket actualizado");
    router.refresh();
  }

  const replySubject = encodeURIComponent(`Re: ${ticket.subject}`);

  return (
    <div className="rounded-lg border">
      <button
        type="button"
        className="flex w-full items-center gap-3 px-4 py-3 text-left"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{ticket.subject}</p>
          <p className="truncate text-xs text-muted-foreground">
            {ticket.name} · {ticket.email} · {formatDateTime(ticket.created_at)}
          </p>
        </div>
        <Badge variant="outline" className="hidden shrink-0 sm:inline-flex">
          {supportCategoryLabels[ticket.category]}
        </Badge>
        <Badge variant={statusVariant[ticket.status]} className="shrink-0">
          {supportStatusLabels[ticket.status]}
        </Badge>
        <ChevronDown
          className={cn("size-4 shrink-0 text-muted-foreground transition-transform", expanded && "rotate-180")}
        />
      </button>

      {expanded ? (
        <div className="flex flex-col gap-3 border-t px-4 py-3">
          <p className="text-sm whitespace-pre-wrap">{ticket.message}</p>
          {ticket.user_id ? (
            <p className="text-xs text-muted-foreground">Envió el mensaje con sesión iniciada.</p>
          ) : null}

          <div className="flex flex-wrap items-center gap-2">
            <Select value={status} onValueChange={(v) => setStatus(v as SupportStatus)}>
              <SelectTrigger className="w-40">
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
            <Button variant="outline" size="sm" asChild>
              <a href={`mailto:${ticket.email}?subject=${replySubject}`}>
                <Mail /> Responder por correo
              </a>
            </Button>
          </div>

          <Textarea
            rows={3}
            maxLength={2000}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Nota interna (solo la ves tú)"
          />
          <Button size="sm" className="w-fit" disabled={!dirty || saving} onClick={handleSave}>
            {saving ? <Loader2 className="animate-spin" /> : null}
            Guardar cambios
          </Button>
        </div>
      ) : null}
    </div>
  );
}

export function SupportTicketsManager({ tickets }: { tickets: SupportTicket[] }) {
  const [filter, setFilter] = React.useState<Filter>("open");

  const counts = React.useMemo(() => {
    const c: Record<Filter, number> = { all: tickets.length, open: 0, in_progress: 0, resolved: 0 };
    for (const t of tickets) c[t.status] += 1;
    return c;
  }, [tickets]);

  const visible = filter === "all" ? tickets : tickets.filter((t) => t.status === filter);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => setFilter(f.value)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
              filter === f.value
                ? "border-primary bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {f.label} ({counts[f.value]})
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <p className="py-16 text-center text-sm text-muted-foreground">No hay tickets aquí.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {visible.map((ticket) => (
            <TicketRow key={ticket.id} ticket={ticket} />
          ))}
        </div>
      )}
    </div>
  );
}
