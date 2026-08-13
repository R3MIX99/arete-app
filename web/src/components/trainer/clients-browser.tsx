"use client";

import * as React from "react";
import Link from "next/link";
import { Search, UserPlus, Copy, X, UserX, UserCheck, FilterX } from "lucide-react";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import { initialsOf, goalLabel } from "@/lib/format";
import type { ClientProfile, PendingInvitation } from "@/lib/types/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { MobileFab } from "@/components/trainer/mobile-fab";

const GOAL_OPTIONS: { value: string; label: string }[] = [
  { value: "lose_weight", label: "Perder peso" },
  { value: "gain_muscle", label: "Ganar músculo" },
  { value: "maintenance", label: "Mantenimiento" },
  { value: "performance", label: "Rendimiento" },
];

type StatusFilter = "active" | "inactive" | null;

export function ClientsBrowser({
  clients,
  invitations,
}: {
  clients: ClientProfile[];
  invitations: PendingInvitation[];
}) {
  const [query, setQuery] = React.useState("");
  const [status, setStatus] = React.useState<StatusFilter>("active");
  const [goal, setGoal] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(invitations);
  const [items, setItems] = React.useState(clients);
  const [togglingId, setTogglingId] = React.useState<string | null>(null);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((client) => {
      if (status && client.status !== status) return false;
      if (goal && client.goal !== goal) return false;
      if (
        q &&
        !client.full_name.toLowerCase().includes(q) &&
        !client.email.toLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [items, query, status, goal]);

  async function toggleClientStatus(event: React.MouseEvent, client: ClientProfile) {
    event.preventDefault();
    event.stopPropagation();
    const next = client.status === "active" ? "inactive" : "active";
    setTogglingId(client.id);
    const supabase = createClient();
    const { error } = await supabase
      .from("profiles")
      .update({ status: next })
      .eq("id", client.id);
    setTogglingId(null);
    if (error) {
      toast.error("No se pudo actualizar el estado");
      return;
    }
    setItems((prev) =>
      prev.map((c) => (c.id === client.id ? { ...c, status: next } : c)),
    );
    toast.success(next === "active" ? "Cliente reactivado" : "Cliente desactivado");
  }

  async function revokeInvitation(id: string) {
    const supabase = createClient();
    const { error } = await supabase
      .from("client_invitations")
      .update({ status: "revoked" })
      .eq("id", id);
    if (!error) {
      setPending((prev) => prev.filter((inv) => inv.id !== id));
      toast.success("Invitación revocada");
    } else {
      toast.error("No se pudo revocar la invitación");
    }
  }

  function copyInviteLink(token: string) {
    const url = `${window.location.origin}/registro/invitacion/${token}`;
    navigator.clipboard.writeText(url);
    toast.success("Enlace copiado");
  }

  function clearFilters() {
    setQuery("");
    setStatus(null);
    setGoal(null);
  }

  const hasActiveFilters = query.trim() !== "" || status !== null || goal !== null;

  return (
    <div className="flex w-full flex-col gap-6 p-4 pb-24 md:p-8">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-xs">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nombre o correo"
            className="pl-9"
          />
        </div>
        <Button asChild className="ml-auto hidden md:inline-flex">
          <Link href="/entrenador/clientes/nuevo">
            <UserPlus />
            Agregar cliente
          </Link>
        </Button>
      </div>

      <MobileFab
        href="/entrenador/clientes/nuevo"
        icon={UserPlus}
        label="Agregar cliente"
      />

      <div className="flex flex-wrap items-center gap-2">
        <Badge
          variant={status === "active" ? "default" : "outline"}
          className="h-7 cursor-pointer px-3"
          onClick={() => setStatus((s) => (s === "active" ? null : "active"))}
        >
          Activos
        </Badge>
        <Badge
          variant={status === "inactive" ? "default" : "outline"}
          className="h-7 cursor-pointer px-3"
          onClick={() => setStatus((s) => (s === "inactive" ? null : "inactive"))}
        >
          Inactivos
        </Badge>
        <div className="mx-1 h-4 w-px bg-border" />
        {GOAL_OPTIONS.map((option) => (
          <Badge
            key={option.value}
            variant={goal === option.value ? "default" : "outline"}
            className="h-7 cursor-pointer px-3"
            onClick={() => setGoal((g) => (g === option.value ? null : option.value))}
          >
            {option.label}
          </Badge>
        ))}
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground"
          disabled={!hasActiveFilters}
          onClick={clearFilters}
        >
          <FilterX /> Limpiar filtros
        </Button>
      </div>

      {pending.length > 0 && (
        <div className="flex flex-col gap-2">
          <h2 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            Invitaciones pendientes
          </h2>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {pending.map((invitation) => (
              <Card key={invitation.id}>
                <CardContent className="flex flex-col gap-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {invitation.full_name || invitation.email}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {invitation.email}
                    </p>
                    {invitation.goal && (
                      <Badge variant="secondary" className="mt-1.5">
                        {goalLabel(invitation.goal)}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => copyInviteLink(invitation.token)}
                    >
                      <Copy /> Copiar enlace
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Revocar invitación"
                      onClick={() => revokeInvitation(invitation.id)}
                    >
                      <X />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <h2 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          Clientes
        </h2>
        {filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-16 text-center text-muted-foreground">
          <UserX className="size-8" />
          <p className="text-sm">
            {items.length === 0
              ? "Todavía no tienes clientes."
              : "Ningún cliente coincide con la búsqueda o los filtros."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((client) => (
            <Card key={client.id} className="h-full transition-colors hover:border-primary/40">
              <CardContent className="flex h-full flex-col gap-3">
                <Link href={`/entrenador/clientes/${client.id}`} className="flex flex-1 flex-col gap-3">
                  <div className="flex items-start justify-between">
                    <Avatar className="size-10">
                      <AvatarFallback
                        className={
                          client.status === "inactive" ? "opacity-50" : undefined
                        }
                      >
                        {initialsOf(client.full_name) || "?"}
                      </AvatarFallback>
                    </Avatar>
                    {client.status === "inactive" && (
                      <Badge variant="warning">Inactivo</Badge>
                    )}
                  </div>
                  <div className="mt-auto">
                    <p className="truncate text-sm font-semibold">{client.full_name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {client.email}
                    </p>
                    {client.goal && (
                      <Badge variant="secondary" className="mt-2">
                        {goalLabel(client.goal)}
                      </Badge>
                    )}
                  </div>
                </Link>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={togglingId === client.id}
                  onClick={(e) => toggleClientStatus(e, client)}
                  className={
                    client.status === "active"
                      ? "text-destructive hover:text-destructive"
                      : "text-success hover:text-success"
                  }
                >
                  {client.status === "active" ? <UserX /> : <UserCheck />}
                  {client.status === "active" ? "Desactivar" : "Reactivar"}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
        )}
      </div>
    </div>
  );
}
