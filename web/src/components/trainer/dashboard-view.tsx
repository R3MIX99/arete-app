"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Users,
  UserX,
  UserCheck,
  Dumbbell,
  CalendarDays,
  Plus,
  Apple,
  UserPlus,
  ChevronDown,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

import { initialsOf, formatDate } from "@/lib/format";
import { createClient } from "@/lib/supabase/client";
import { logActivity, startTiming } from "@/lib/log-activity";
import { sessionsInRange, todayKey, type CalendarAssignment } from "@/lib/calendar-logic";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ClientPickerDialog } from "@/components/trainer/client-picker-dialog";
import { ProgressLineChart } from "@/components/trainer/progress-line-chart";

interface ClientOption {
  id: string;
  full_name: string;
}

interface InactiveClient {
  id: string;
  full_name: string;
  email: string;
  deactivated_at: string | null;
}

interface WeightRow {
  client_id: string;
  entry_date: string;
  value: number;
}

/** Cuántos clientes se listan antes de cortar con "Ver más". */
const CLIENTS_TODAY_LIMIT = 4;

const quickActions = [
  { label: "Crear rutina", href: "/entrenador/rutinas/nueva", icon: Plus },
  { label: "Crear programa", href: "/entrenador/programas/nuevo", icon: CalendarDays },
  { label: "Crear plan nutricional", href: "/entrenador/nutricion/planes/nuevo", icon: Apple },
  { label: "Agregar cliente", href: "/entrenador/clientes/nuevo", icon: UserPlus },
];

/**
 * El día de "hoy" se calcula aquí, en el navegador — no en el servidor.
 * En el servidor (Vercel corre en UTC) un domingo por la noche en
 * México ya es lunes en UTC, así que el dashboard mostraba como
 * "sesiones de hoy" las del día siguiente. Mismo patrón que ya usaban
 * ClientHomeToday y ClientAgenda.
 */
export function DashboardView({
  activeClientsCount,
  inactiveClients,
  routineCount,
  assignments,
  clientOptions,
  weightMeasurements,
}: {
  activeClientsCount: number;
  inactiveClients: InactiveClient[];
  routineCount: number;
  assignments: CalendarAssignment[];
  clientOptions: ClientOption[];
  weightMeasurements: WeightRow[];
}) {
  const router = useRouter();
  const [reactivatingId, setReactivatingId] = React.useState<string | null>(null);

  async function reactivateClient(client: InactiveClient) {
    setReactivatingId(client.id);
    const startedAt = startTiming();
    const supabase = createClient();
    const { error } = await supabase
      .from("profiles")
      .update({ status: "active" })
      .eq("id", client.id);
    setReactivatingId(null);
    if (error) {
      logActivity({
        action: "trainer.client_status_change_failed",
        category: "trainer",
        severity: "error",
        message: `No se pudo reactivar a ${client.full_name}`,
        targetType: "profile",
        targetId: client.id,
        targetLabel: client.full_name,
        startedAt,
        context: { attemptedStatus: "active", errorCode: error.code, reason: error.message },
      });
      toast.error("No se pudo reactivar — recarga la página e intenta de nuevo");
      return;
    }
    logActivity({
      action: "trainer.client_reactivated",
      category: "trainer",
      severity: "success",
      message: `Reactivó a ${client.full_name}`,
      targetType: "profile",
      targetId: client.id,
      targetLabel: client.full_name,
      startedAt,
    });
    toast.success(`${client.full_name} vuelve a estar activo`);
    router.refresh();
  }

  const today = React.useMemo(() => todayKey(), []);
  const todaySessions = React.useMemo(
    () => sessionsInRange(assignments, today, today),
    [assignments, today],
  );

  // Al entrenador le importa QUIÉN va hoy al gimnasio, no cuántas
  // rutinas hay: un mismo cliente puede tener cardio y programa el mismo
  // día y aparecía dos veces en la lista. Se agrupa por cliente y sus
  // rutinas del día se juntan en una sola línea.
  const clientsToday = React.useMemo(() => {
    const byClient = new Map<string, { clientId: string; clientName: string; routines: string[] }>();
    for (const session of todaySessions) {
      const entry = byClient.get(session.clientId) ?? {
        clientId: session.clientId,
        clientName: session.clientName,
        routines: [],
      };
      if (!entry.routines.includes(session.routineName)) entry.routines.push(session.routineName);
      byClient.set(session.clientId, entry);
    }
    return Array.from(byClient.values()).sort((a, b) => a.clientName.localeCompare(b.clientName));
  }, [todaySessions]);

  const [showAllClientsToday, setShowAllClientsToday] = React.useState(false);
  const visibleClientsToday = showAllClientsToday
    ? clientsToday
    : clientsToday.slice(0, CLIENTS_TODAY_LIMIT);

  const [pickerOpen, setPickerOpen] = React.useState(false);
  const [selectedClient, setSelectedClient] = React.useState<ClientOption | null>(
    clientOptions[0] ?? null,
  );

  const stats = [
    { label: "Clientes activos", value: activeClientsCount, icon: Users },
    { label: "Clientes inactivos", value: inactiveClients.length, icon: UserX },
    { label: "Rutinas creadas", value: routineCount, icon: Dumbbell },
    { label: "Clientes hoy", value: clientsToday.length, icon: CalendarDays },
  ];

  const chartPoints = React.useMemo(() => {
    if (!selectedClient) return [];
    return weightMeasurements
      .filter((m) => m.client_id === selectedClient.id)
      .map((m) => ({ label: formatDate(m.entry_date), value: m.value }));
  }, [weightMeasurements, selectedClient]);

  return (
    <div className="flex w-full flex-col gap-8 p-4 pb-24 md:p-8">
      <section className="flex flex-col gap-3">
        <h2 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          Resumen
        </h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {stats.map((stat) => (
            <Card key={stat.label}>
              <CardContent className="flex flex-col gap-3">
                <div className="flex size-9 items-center justify-center rounded-lg bg-primary/12 text-primary">
                  <stat.icon className="size-[18px]" />
                </div>
                <div>
                  <p className="text-2xl font-bold tracking-tight tabular-nums">{stat.value}</p>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          Accesos directos
        </h2>
        <div className="flex flex-wrap gap-2">
          {quickActions.map((action) => (
            <Button key={action.label} variant="outline" asChild>
              <Link href={action.href}>
                <action.icon />
                {action.label}
              </Link>
            </Button>
          ))}
        </div>
      </section>

      <section className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className="flex flex-col gap-3">
          <h2 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            Clientes que entrenan hoy
          </h2>
          {clientsToday.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center gap-2 py-10 text-center text-muted-foreground">
                <CalendarDays className="size-6" />
                <p className="text-sm">Ningún cliente tiene sesión programada hoy.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {visibleClientsToday.map((client) => (
                  <div
                    key={client.clientId}
                    className="flex flex-col gap-3 rounded-xl border border-border/40 p-4"
                  >
                    <Avatar className="size-11">
                      <AvatarFallback>{initialsOf(client.clientName)}</AvatarFallback>
                    </Avatar>
                    <p className="text-sm font-semibold">{client.clientName}</p>
                    <div className="flex flex-col gap-1">
                      <p className="text-xs font-medium text-muted-foreground">Rutinas</p>
                      <ul className="flex flex-col gap-0.5">
                        {client.routines.map((routine) => (
                          <li
                            key={routine}
                            className="flex gap-1.5 text-xs text-muted-foreground"
                          >
                            <span aria-hidden>•</span>
                            <span className="min-w-0">{routine}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <Button asChild variant="secondary" size="sm" className="mt-auto w-full">
                      <Link href={`/entrenador/clientes/${client.clientId}`}>Ver agenda</Link>
                    </Button>
                  </div>
                ))}
              </div>

              {/* Con más de cuatro la lista se vuelve un muro en teléfono:
                  se corta y el resto se ve en el calendario del día. */}
              {clientsToday.length > CLIENTS_TODAY_LIMIT && !showAllClientsToday ? (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => setShowAllClientsToday(true)}
                >
                  Ver {clientsToday.length - CLIENTS_TODAY_LIMIT} más
                </Button>
              ) : null}

              <Button variant="ghost" className="w-full" asChild>
                <Link href="/entrenador/calendario">
                  Ver todos en el calendario <ChevronRight />
                </Link>
              </Button>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3">
          <h2 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            Clientes inactivos
          </h2>
          {inactiveClients.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center gap-2 py-10 text-center text-muted-foreground">
                <UserX className="size-6" />
                <p className="text-sm">No tienes clientes inactivos por el momento.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {inactiveClients.map((client) => (
                <div
                  key={client.id}
                  className="flex flex-col gap-3 rounded-xl border border-border/40 p-4"
                >
                  <Avatar className="size-11 opacity-60">
                    <AvatarFallback className="text-xs">
                      {initialsOf(client.full_name) || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <Link
                    href={`/entrenador/clientes/${client.id}`}
                    className="truncate text-sm font-semibold text-muted-foreground hover:text-foreground"
                  >
                    {client.full_name}
                  </Link>
                  {client.deactivated_at && (
                    <div className="flex flex-col gap-1">
                      <p className="text-xs font-medium text-muted-foreground">Inactivo desde</p>
                      <ul className="flex flex-col gap-0.5">
                        <li className="flex gap-1.5 text-xs text-muted-foreground">
                          <span aria-hidden>•</span>
                          <span className="min-w-0">
                            {formatDate(client.deactivated_at.slice(0, 10))}
                          </span>
                        </li>
                      </ul>
                    </div>
                  )}
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="mt-auto w-full gap-1.5"
                    disabled={reactivatingId === client.id}
                    onClick={() => reactivateClient(client)}
                  >
                    {reactivatingId === client.id ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <UserCheck className="size-3.5" />
                    )}
                    Reactivar
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          Progreso de peso por cliente
        </h2>
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-sm">Evolución de peso corporal</CardTitle>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => setPickerOpen(true)}
              disabled={clientOptions.length === 0}
            >
              <Avatar className="size-5">
                <AvatarFallback className="text-[10px]">
                  {selectedClient ? initialsOf(selectedClient.full_name) || "?" : "?"}
                </AvatarFallback>
              </Avatar>
              {selectedClient ? selectedClient.full_name : "Elegir cliente"}
              <ChevronDown className="size-3.5" />
            </Button>
          </CardHeader>
          <CardContent>
            {clientOptions.length === 0 ? (
              <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
                Todavía no tienes clientes registrados.
              </div>
            ) : (
              <ProgressLineChart
                points={chartPoints}
                unit="kg"
                emptyMessage="Este cliente todavía no tiene registros de peso."
              />
            )}
          </CardContent>
        </Card>
      </section>

      <ClientPickerDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        clients={clientOptions}
        onPick={(client) => setSelectedClient(client)}
      />
    </div>
  );
}
