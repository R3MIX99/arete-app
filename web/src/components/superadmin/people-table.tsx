"use client";

import * as React from "react";
import Link from "next/link";
import { Search, UsersRound } from "lucide-react";

import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  subscriptionPlanLabels,
  subscriptionStatusLabels,
  subscriptionStatusVariants,
  type SubscriptionPlan,
  type SubscriptionStatus,
} from "@/lib/types/settings";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export interface PersonRow {
  id: string;
  full_name: string;
  email: string;
  status: string;
  created_at: string;
  subscription_plan: SubscriptionPlan;
  subscription_status: SubscriptionStatus;
  /** Entrenadores: cuántos clientes tienen. Clientes: su entrenador. */
  secondary: string;
  clientCount?: number;
}

const STATUS_OPTIONS = [
  { value: "active", label: "Activos" },
  { value: "inactive", label: "Inactivos" },
];

/**
 * Listado de personas (entrenadores o clientes) con buscador y filtros
 * por plan y estado. Se comparte entre las dos secciones porque la
 * información que interesa al superadmin es la misma; solo cambia el
 * texto de la columna secundaria y a dónde apunta cada fila.
 */
export function PeopleTable({
  people,
  detailHrefBase,
  secondaryLabel,
  emptyMessage,
}: {
  people: PersonRow[];
  detailHrefBase: string;
  secondaryLabel: string;
  emptyMessage: string;
}) {
  const [query, setQuery] = React.useState("");
  const [plan, setPlan] = React.useState<SubscriptionPlan | null>(null);
  const [status, setStatus] = React.useState<string | null>(null);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return people.filter((person) => {
      if (plan && person.subscription_plan !== plan) return false;
      if (status && person.status !== status) return false;
      if (q && !`${person.full_name} ${person.email}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [people, query, plan, status]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3">
        <div className="relative max-w-sm">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nombre o correo"
            className="pl-9"
          />
        </div>

        <div className="flex flex-wrap gap-1.5">
          {(Object.keys(subscriptionPlanLabels) as SubscriptionPlan[]).map((option) => (
            <Badge
              key={option}
              variant={plan === option ? "default" : "outline"}
              className="h-7 cursor-pointer px-3"
              onClick={() => setPlan((p) => (p === option ? null : option))}
            >
              {subscriptionPlanLabels[option]}
            </Badge>
          ))}
          <span className="mx-1 self-center text-muted-foreground">·</span>
          {STATUS_OPTIONS.map((option) => (
            <Badge
              key={option.value}
              variant={status === option.value ? "default" : "outline"}
              className="h-7 cursor-pointer px-3"
              onClick={() => setStatus((s) => (s === option.value ? null : option.value))}
            >
              {option.label}
            </Badge>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-12 text-center text-muted-foreground">
            <UsersRound className="size-7" />
            <p className="text-sm">
              {people.length === 0 ? emptyMessage : "Nadie coincide con la búsqueda o los filtros."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Escritorio: tabla. Teléfono: tarjetas — una tabla de seis
              columnas ahí obliga a hacer scroll horizontal. */}
          <div className="hidden overflow-x-auto rounded-lg border md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-foreground/[0.02] text-left text-xs text-muted-foreground uppercase">
                  <th className="px-3 py-2 font-medium">Nombre</th>
                  <th className="px-3 py-2 font-medium">{secondaryLabel}</th>
                  <th className="px-3 py-2 font-medium">Plan</th>
                  <th className="px-3 py-2 font-medium">Estado</th>
                  <th className="px-3 py-2 font-medium">Alta</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((person) => (
                  <tr key={person.id} className="border-b last:border-0 hover:bg-accent/40">
                    <td className="px-3 py-2">
                      <Link href={`${detailHrefBase}/${person.id}`} className="block">
                        <span className="font-medium">{person.full_name}</span>
                        <span className="block text-xs text-muted-foreground">{person.email}</span>
                      </Link>
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">{person.secondary}</td>
                    <td className="px-3 py-2">
                      <Badge variant="secondary">
                        {subscriptionPlanLabels[person.subscription_plan]}
                      </Badge>
                    </td>
                    <td className="px-3 py-2">
                      <Badge
                        variant={
                          person.status === "active"
                            ? subscriptionStatusVariants[person.subscription_status]
                            : "destructive"
                        }
                      >
                        {person.status === "active"
                          ? subscriptionStatusLabels[person.subscription_status]
                          : "Inactivo"}
                      </Badge>
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {formatDate(person.created_at.slice(0, 10))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-2 md:hidden">
            {filtered.map((person) => (
              <Link key={person.id} href={`${detailHrefBase}/${person.id}`}>
                <Card className="transition-colors hover:bg-accent/40">
                  <CardContent className="flex flex-col gap-2 p-4">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{person.full_name}</p>
                      <p className="truncate text-xs text-muted-foreground">{person.email}</p>
                    </div>
                    <p className="text-xs text-muted-foreground">{person.secondary}</p>
                    <div className="flex flex-wrap gap-1.5">
                      <Badge variant="secondary">
                        {subscriptionPlanLabels[person.subscription_plan]}
                      </Badge>
                      <Badge
                        variant={
                          person.status === "active"
                            ? subscriptionStatusVariants[person.subscription_status]
                            : "destructive"
                        }
                      >
                        {person.status === "active"
                          ? subscriptionStatusLabels[person.subscription_status]
                          : "Inactivo"}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>

          <p className={cn("text-xs text-muted-foreground")}>
            {filtered.length} de {people.length}
          </p>
        </>
      )}
    </div>
  );
}
