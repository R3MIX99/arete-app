"use client";

import * as React from "react";
import Link from "next/link";
import { Users, UserX, Dumbbell, CalendarDays, Plus, Apple, UserPlus, ChevronDown } from "lucide-react";

import { initialsOf, formatDate } from "@/lib/format";
import type { CalendarSession } from "@/lib/calendar-logic";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarSessionList } from "@/components/trainer/calendar-session-list";
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
}

interface WeightRow {
  client_id: string;
  entry_date: string;
  value: number;
}

const quickActions = [
  { label: "Crear rutina", href: "/entrenador/rutinas/nueva", icon: Plus },
  { label: "Crear programa", href: "/entrenador/programas/nuevo", icon: CalendarDays },
  { label: "Crear plan nutricional", href: "/entrenador/nutricion/planes/nuevo", icon: Apple },
  { label: "Agregar cliente", href: "/entrenador/clientes/nuevo", icon: UserPlus },
];

export function DashboardView({
  activeClientsCount,
  inactiveClients,
  routineCount,
  todaySessions,
  clientOptions,
  weightMeasurements,
}: {
  activeClientsCount: number;
  inactiveClients: InactiveClient[];
  routineCount: number;
  todaySessions: CalendarSession[];
  clientOptions: ClientOption[];
  weightMeasurements: WeightRow[];
}) {
  const [pickerOpen, setPickerOpen] = React.useState(false);
  const [selectedClient, setSelectedClient] = React.useState<ClientOption | null>(
    clientOptions[0] ?? null,
  );

  const stats = [
    { label: "Clientes activos", value: activeClientsCount, icon: Users },
    { label: "Clientes inactivos", value: inactiveClients.length, icon: UserX },
    { label: "Rutinas creadas", value: routineCount, icon: Dumbbell },
    { label: "Sesiones de hoy", value: todaySessions.length, icon: CalendarDays },
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
            Sesiones de hoy
          </h2>
          {todaySessions.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center gap-2 py-10 text-center text-muted-foreground">
                <CalendarDays className="size-6" />
                <p className="text-sm">Ningún cliente tiene sesión programada hoy.</p>
              </CardContent>
            </Card>
          ) : (
            <CalendarSessionList sessions={todaySessions} />
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
            <Card>
              <CardContent className="flex flex-col gap-1 px-0">
                {inactiveClients.map((client) => (
                  <Link
                    key={client.id}
                    href={`/entrenador/clientes/${client.id}`}
                    className="flex items-center gap-3 px-5 py-2 transition-colors hover:bg-accent"
                  >
                    <Avatar className="size-8 shrink-0 opacity-60">
                      <AvatarFallback className="text-xs">
                        {initialsOf(client.full_name) || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{client.full_name}</p>
                      <p className="truncate text-xs text-muted-foreground">{client.email}</p>
                    </div>
                    <Badge variant="warning" className="shrink-0 text-[10px]">
                      Inactivo
                    </Badge>
                  </Link>
                ))}
              </CardContent>
            </Card>
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
