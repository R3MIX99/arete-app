"use client";

import * as React from "react";
import Link from "next/link";
import {
  Search,
  UserPlus,
  Copy,
  X,
  UserX,
  UserCheck,
  FilterX,
  SlidersHorizontal,
  ChevronDown,
  Check,
} from "lucide-react";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import { logActivity, startTiming } from "@/lib/log-activity";
import { initialsOf, goalLabel, formatDate } from "@/lib/format";
import { subscriptionPlanLabels, type SubscriptionPlan } from "@/lib/types/settings";
import type { ClientUsage } from "@/lib/types/plans";
import { PlansDialog } from "@/components/trainer/plans-dialog";
import { useIsNativeApp } from "@/lib/hooks/use-is-native-app";
import type { ClientProfile, PendingInvitation } from "@/lib/types/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MobileFab } from "@/components/trainer/mobile-fab";

interface TeamOption {
  id: string;
  full_name: string;
}

const TRAINER_ACCENT = "bg-primary text-primary-foreground";
const NUTRITIONIST_ACCENT = "bg-emerald-500 text-white dark:bg-emerald-600";

/** Quién atiende al cliente: avatares apilados (entrenador + nutriólogo,
 *  uno encima asomándose del otro) con un solo chevrón al final — un
 *  único clic abre una sola lista con todo el equipo, agrupada por rol.
 *  Elegir a alguien en "Entrenador" reemplaza solo al entrenador (nunca
 *  puede haber dos a la vez); elegir en "Nutriólogo" reemplaza solo al
 *  nutriólogo — son independientes entre sí. Solo lo ven admin/
 *  supervisor (isGymManager). */
function TeamAssignmentPicker({
  client,
  trainerOptions,
  nutritionistOptions,
  disabled,
  onSelect,
}: {
  client: ClientProfile;
  trainerOptions: TeamOption[];
  nutritionistOptions: TeamOption[];
  disabled: boolean;
  onSelect: (field: "trainer_id" | "nutritionist_id", profileId: string | null) => void;
}) {
  const slots: { id: string | null | undefined; name: string | null | undefined; accent: string }[] = [
    { id: client.trainer_id, name: client.trainer_name, accent: TRAINER_ACCENT },
    { id: client.nutritionist_id, name: client.nutritionist_name, accent: NUTRITIONIST_ACCENT },
  ];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          title="Entrenador y nutriólogo asignados"
          className="flex shrink-0 items-center gap-0.5 rounded-full transition-transform hover:scale-105 disabled:opacity-60"
        >
          <div className="flex items-center">
            {slots.map((slot, i) =>
              slot.id ? (
                <Avatar
                  key={i}
                  className={`size-7 ring-2 ring-background ${i > 0 ? "-ml-2.5" : ""}`}
                >
                  <AvatarFallback className={`text-[10px] ${slot.accent}`}>
                    {initialsOf(slot.name ?? "") || "?"}
                  </AvatarFallback>
                </Avatar>
              ) : (
                <span
                  key={i}
                  className={`flex size-7 items-center justify-center rounded-full border border-dashed border-muted-foreground/40 bg-background text-muted-foreground ${i > 0 ? "-ml-2.5" : ""}`}
                >
                  <UserPlus className="size-3.5" />
                </span>
              ),
            )}
          </div>
          <ChevronDown className="size-3.5 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
        <DropdownMenuLabel>Entrenador</DropdownMenuLabel>
        {trainerOptions.length === 0 ? (
          <p className="px-2 py-1.5 text-xs text-muted-foreground">Nadie con este rol todavía.</p>
        ) : (
          trainerOptions.map((t) => (
            <DropdownMenuItem
              key={`trainer-${t.id}`}
              onClick={() => onSelect("trainer_id", t.id)}
              className={t.id === client.trainer_id ? "font-medium" : undefined}
            >
              <Avatar className="size-5">
                <AvatarFallback className={`text-[9px] ${TRAINER_ACCENT}`}>
                  {initialsOf(t.full_name) || "?"}
                </AvatarFallback>
              </Avatar>
              {t.full_name}
              {t.id === client.trainer_id ? <Check className="ml-auto size-3.5" /> : null}
            </DropdownMenuItem>
          ))
        )}
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Nutriólogo</DropdownMenuLabel>
        <DropdownMenuItem
          onClick={() => onSelect("nutritionist_id", null)}
          className={!client.nutritionist_id ? "font-medium" : undefined}
        >
          <span className="flex size-5 items-center justify-center rounded-full border border-dashed border-muted-foreground/40 text-muted-foreground">
            <X className="size-3" />
          </span>
          Sin nutriólogo — lo maneja el entrenador
          {!client.nutritionist_id ? <Check className="ml-auto size-3.5" /> : null}
        </DropdownMenuItem>
        {nutritionistOptions.length === 0 ? null : (
          nutritionistOptions.map((t) => (
            <DropdownMenuItem
              key={`nutritionist-${t.id}`}
              onClick={() => onSelect("nutritionist_id", t.id)}
              className={t.id === client.nutritionist_id ? "font-medium" : undefined}
            >
              <Avatar className="size-5">
                <AvatarFallback className={`text-[9px] ${NUTRITIONIST_ACCENT}`}>
                  {initialsOf(t.full_name) || "?"}
                </AvatarFallback>
              </Avatar>
              {t.full_name}
              {t.id === client.nutritionist_id ? <Check className="ml-auto size-3.5" /> : null}
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

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
  usage,
  planKey,
  isGymManager = false,
  trainerOptions = [],
  nutritionistOptions = [],
}: {
  clients: ClientProfile[];
  invitations: PendingInvitation[];
  usage: ClientUsage;
  planKey: SubscriptionPlan;
  /** admin/supervisor del gimnasio (Fase F) — muestra a quién atiende
   *  cada cliente y deja reasignarlo a otro compañero de equipo, por
   *  separado para rutinas (trainerOptions) y nutrición
   *  (nutritionistOptions) — un cliente puede tener ambos a la vez. */
  isGymManager?: boolean;
  trainerOptions?: TeamOption[];
  nutritionistOptions?: TeamOption[];
}) {
  const [query, setQuery] = React.useState("");
  const [status, setStatus] = React.useState<StatusFilter>(null);
  const [goal, setGoal] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(invitations);
  const [items, setItems] = React.useState(clients);
  const [togglingId, setTogglingId] = React.useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = React.useState(false);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return items
      .filter((client) => {
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
      })
      // Los inactivos se van hasta el final de la lista.
      .sort((a, b) => {
        if (a.status === b.status) return 0;
        return a.status === "inactive" ? 1 : -1;
      });
  }, [items, query, status, goal]);

  async function toggleClientStatus(event: React.MouseEvent, client: ClientProfile) {
    event.preventDefault();
    event.stopPropagation();
    const next = client.status === "active" ? "inactive" : "active";
    const startedAt = startTiming();
    setTogglingId(client.id);
    const supabase = createClient();
    let { error } = await supabase
      .from("profiles")
      .update({ status: next })
      .eq("id", client.id);
    // Si dejaste la pestaña abierta y sin foco un rato, el token de
    // sesión pudo haber expirado (Supabase solo lo refresca solo cuando
    // la pestaña está visible) — un PATCH que cae justo en ese momento
    // sale con 401 aunque el permiso sea correcto. Se refresca la sesión
    // a mano y se reintenta una vez antes de darlo por fallido de verdad.
    if (error && (error.code === "PGRST301" || /JWT|token/i.test(error.message))) {
      const { error: refreshError } = await supabase.auth.refreshSession();
      if (!refreshError) {
        ({ error } = await supabase
          .from("profiles")
          .update({ status: next })
          .eq("id", client.id));
      }
    }
    setTogglingId(null);
    if (error) {
      logActivity({
        action: "trainer.client_status_change_failed",
        category: "trainer",
        severity: "error",
        message: `No se pudo ${next === "active" ? "reactivar" : "desactivar"} a ${client.full_name}`,
        targetType: "profile",
        targetId: client.id,
        targetLabel: client.full_name,
        startedAt,
        context: { attemptedStatus: next, errorCode: error.code, reason: error.message },
      });
      // El trigger de límite de plan lanza P0001 con un mensaje ya en
      // español y accionable — se muestra tal cual.
      toast.error(
        error.code === "P0001"
          ? error.message
          : "No se pudo actualizar el estado — recarga la página e intenta de nuevo",
      );
      return;
    }
    setItems((prev) =>
      prev.map((c) => (c.id === client.id ? { ...c, status: next } : c)),
    );
    logActivity({
      action: next === "active" ? "trainer.client_reactivated" : "trainer.client_deactivated",
      category: "trainer",
      severity: "success",
      message: `${next === "active" ? "Reactivó" : "Desactivó"} a ${client.full_name}`,
      targetType: "profile",
      targetId: client.id,
      targetLabel: client.full_name,
      startedAt,
    });
    toast.success(next === "active" ? "Cliente reactivado" : "Cliente desactivado");
  }

  const [reassigningId, setReassigningId] = React.useState<string | null>(null);

  /** field="trainer_id" reasigna quién lleva las rutinas (siempre
   *  requiere a alguien — no se puede quitar); field="nutritionist_id"
   *  reasigna quién lleva la nutrición, o se puede dejar en null
   *  (newProfileId = null) para quitarlo del todo — en ese caso la
   *  nutrición vuelve a caer en el entrenador (mismo fallback que
   *  can_manage_client_nutrition en la base). Son independientes,
   *  cambiar uno nunca toca el otro. */
  async function reassignClient(
    client: ClientProfile,
    field: "trainer_id" | "nutritionist_id",
    newProfileId: string | null,
  ) {
    const currentId = field === "trainer_id" ? client.trainer_id : client.nutritionist_id;
    if (newProfileId === currentId) return;
    const options = field === "trainer_id" ? trainerOptions : nutritionistOptions;
    const nameField = field === "trainer_id" ? "trainer_name" : "nutritionist_name";

    setReassigningId(client.id);
    const supabase = createClient();
    const { error } = await supabase
      .from("profiles")
      .update({ [field]: newProfileId })
      .eq("id", client.id);
    setReassigningId(null);

    if (error) {
      toast.error(error.message || "No se pudo reasignar al cliente.");
      return;
    }

    const newAssignee = newProfileId ? options.find((t) => t.id === newProfileId) : null;
    setItems((prev) =>
      prev.map((c) =>
        c.id === client.id
          ? { ...c, [field]: newProfileId, [nameField]: newAssignee?.full_name ?? null }
          : c,
      ),
    );
    logActivity({
      action: "trainer.client_reassigned",
      category: "trainer",
      severity: "success",
      message: newProfileId
        ? `${client.full_name}: ${field === "trainer_id" ? "entrenador" : "nutriólogo"} reasignado a ${newAssignee?.full_name ?? newProfileId}`
        : `${client.full_name}: se quitó su nutriólogo (vuelve a manejarlo el entrenador)`,
      targetType: "profile",
      targetId: client.id,
      targetLabel: client.full_name,
      context: { field, previousId: currentId, newProfileId },
    });
    toast.success("Cliente reasignado.");
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

  const native = useIsNativeApp();
  const atLimit = usage.limit !== null && usage.activeClients >= usage.limit;
  const overLimit = usage.limit !== null && usage.activeClients > usage.limit;
  const [plansOpen, setPlansOpen] = React.useState(false);

  return (
    <div className="flex w-full flex-col gap-6 p-4 pb-24 md:p-8">
      {usage.limit !== null && (
        <div
          className={
            atLimit
              ? "flex flex-col gap-1 rounded-xl border border-warning/50 bg-warning/10 p-4 text-sm"
              : "flex items-center justify-between gap-3 rounded-xl border border-border/80 p-3 text-sm"
          }
        >
          <p className={atLimit ? "font-medium" : "text-muted-foreground"}>
            <span className="tabular-nums font-semibold text-foreground">
              {usage.activeClients} / {usage.limit}
            </span>{" "}
            clientes activos{native ? "" : ` · plan ${subscriptionPlanLabels[planKey]}`}
            {overLimit && usage.overLimitGraceUntil && (
              <>
                {" — "}
                <span className="text-warning">
                  estás por encima del límite. Tienes hasta el{" "}
                  {formatDate(usage.overLimitGraceUntil.slice(0, 10))} para{" "}
                  {native ? "desactivar a los clientes de más" : "bajar de plan o desactivar a los clientes de más"}.
                </span>
              </>
            )}
            {atLimit && !overLimit && (
              <>
                {native
                  ? " — llegaste al tope. Desactiva a algún cliente para agregar más."
                  : " — llegaste al tope. Sube de plan o contrata un bloque de 5 para agregar más."}
              </>
            )}
          </p>
          {atLimit && !native && (
            <Button
              size="sm"
              variant="outline"
              className="w-fit"
              onClick={() => setPlansOpen(true)}
            >
              Ver planes
            </Button>
          )}
        </div>
      )}

      <PlansDialog
        open={plansOpen}
        onOpenChange={setPlansOpen}
        currentPlan={planKey}
        reason={`Vas ${usage.activeClients} de ${usage.limit} clientes de tu plan ${subscriptionPlanLabels[planKey]}. Sube de plan o contrata un bloque de 5 clientes más para agregar a alguien.`}
      />

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-2 sm:max-w-xs">
          <div className="relative min-w-0 flex-1">
            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por nombre o correo"
              className="pl-9"
            />
          </div>
          <Button
            variant="outline"
            size="icon"
            aria-label="Filtros"
            className="relative shrink-0"
            onClick={() => setFiltersOpen(true)}
          >
            <SlidersHorizontal className="size-4" />
            {(status || goal) && (
              <span className="absolute -top-1 -right-1 size-2.5 rounded-full bg-primary" />
            )}
          </Button>
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

      <ResponsiveDialog open={filtersOpen} onOpenChange={setFiltersOpen} title="Filtros">
        <div className="flex flex-wrap gap-2">
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
        </div>
        <div className="flex flex-wrap gap-2">
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
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="w-fit text-muted-foreground"
          disabled={!hasActiveFilters}
          onClick={clearFilters}
        >
          <FilterX /> Limpiar filtros
        </Button>
      </ResponsiveDialog>

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
            <Card
              key={client.id}
              className={
                client.status === "inactive"
                  ? "h-full transition-colors hover:border-primary/40"
                  : "h-full card-hover-glow transition-colors hover:border-primary/40"
              }
            >
              <CardContent className="flex h-full flex-col gap-3">
                <Link
                  href={`/entrenador/clientes/${client.id}`}
                  className={
                    client.status === "inactive"
                      ? "flex flex-1 flex-col gap-3 opacity-50"
                      : "flex flex-1 flex-col gap-3"
                  }
                >
                  <div className="flex items-start justify-between gap-2">
                    <Avatar className="size-10">
                      <AvatarFallback>{initialsOf(client.full_name) || "?"}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col items-end gap-1.5">
                      {client.status === "inactive" && <Badge variant="warning">Inactivo</Badge>}
                      {client.goal && <Badge variant="secondary">{goalLabel(client.goal)}</Badge>}
                    </div>
                  </div>
                  <div className="mt-auto">
                    <p className="truncate text-sm font-semibold">{client.full_name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {client.email}
                    </p>
                  </div>
                </Link>
                <div className="flex items-center justify-between gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={togglingId === client.id}
                    onClick={(e) => toggleClientStatus(e, client)}
                    className={
                      client.status === "active"
                        ? "shrink-0 rounded-full bg-destructive/10 text-destructive hover:bg-destructive/15 hover:text-destructive"
                        : "shrink-0 rounded-full bg-success/10 text-success hover:bg-success/15 hover:text-success"
                    }
                  >
                    {client.status === "active" ? <UserX /> : <UserCheck />}
                    {client.status === "active" ? "Desactivar" : "Reactivar"}
                  </Button>
                  {isGymManager ? (
                    <TeamAssignmentPicker
                      client={client}
                      trainerOptions={trainerOptions}
                      nutritionistOptions={nutritionistOptions}
                      disabled={reassigningId === client.id}
                      onSelect={(field, profileId) => reassignClient(client, field, profileId)}
                    />
                  ) : null}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        )}
      </div>
    </div>
  );
}
