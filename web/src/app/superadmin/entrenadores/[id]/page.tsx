import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Dumbbell, UserRound, ClipboardList, Apple } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/format";
import {
  subscriptionPlanLabels,
  subscriptionStatusLabels,
  subscriptionStatusVariants,
  type SubscriptionPlan,
  type SubscriptionStatus,
} from "@/lib/types/settings";
import type { PlanCatalogEntry, PlanChangeLogEntry, PlanSource } from "@/lib/types/plans";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PlanManager } from "@/components/superadmin/plan-manager";

interface TrainerRow {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  status: string;
  business_name: string | null;
  subscription_plan: SubscriptionPlan;
  subscription_status: SubscriptionStatus;
  plan_source: PlanSource;
  plan_override_expires_at: string | null;
  created_at: string;
}

interface ChangeLogRow {
  id: string;
  previous_plan: string | null;
  new_plan: string;
  previous_status: string | null;
  new_status: string;
  is_free_grant: boolean;
  expires_at: string | null;
  note: string | null;
  changed_by: string;
  changed_at: string;
  changed_by_profile: { full_name: string } | { full_name: string }[] | null;
}

function one<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

interface ClientRow {
  id: string;
  full_name: string;
  email: string;
  status: string;
  created_at: string;
}

export default async function SuperadminTrainerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [
    { data: trainer },
    { data: clientRows },
    { count: routineCount },
    { count: programCount },
    { count: dietPlanCount },
    { data: planRows },
    { data: changeLogRows },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select(
        "id, full_name, email, phone, status, business_name, subscription_plan, subscription_status, plan_source, plan_override_expires_at, created_at",
      )
      .eq("id", id)
      .eq("role", "trainer")
      .maybeSingle(),
    supabase
      .from("profiles")
      .select("id, full_name, email, status, created_at")
      .eq("trainer_id", id)
      .eq("role", "client")
      .order("full_name"),
    supabase.from("routines").select("id", { count: "exact", head: true }).eq("trainer_id", id),
    supabase.from("programs").select("id", { count: "exact", head: true }).eq("trainer_id", id),
    supabase.from("diet_plans").select("id", { count: "exact", head: true }).eq("trainer_id", id),
    supabase.from("plans").select("id, key, name, price_cents, currency, client_limit, features, is_active, sort_order").eq("is_active", true).order("sort_order"),
    supabase
      .from("plan_change_log")
      .select(
        "id, previous_plan, new_plan, previous_status, new_status, is_free_grant, expires_at, note, changed_by, changed_at, changed_by_profile:changed_by(full_name)",
      )
      .eq("profile_id", id)
      .order("changed_at", { ascending: false }),
  ]);

  if (!trainer) notFound();
  const t = trainer as TrainerRow;
  const clients = (clientRows ?? []) as ClientRow[];
  const plans = (planRows ?? []) as PlanCatalogEntry[];
  const changeLog: PlanChangeLogEntry[] = ((changeLogRows ?? []) as ChangeLogRow[]).map((row) => ({
    ...row,
    changed_by_name: one(row.changed_by_profile)?.full_name ?? null,
  }));

  const stats = [
    { label: "Clientes", value: clients.length, icon: UserRound },
    { label: "Rutinas", value: routineCount ?? 0, icon: Dumbbell },
    { label: "Programas", value: programCount ?? 0, icon: ClipboardList },
    { label: "Planes nutricionales", value: dietPlanCount ?? 0, icon: Apple },
  ];

  return (
    <div className="flex w-full flex-col gap-5 p-4 md:p-8">
      <Link
        href="/superadmin/entrenadores"
        className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" /> Volver a entrenadores
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold">{t.full_name}</h1>
          <p className="text-sm text-muted-foreground">{t.email}</p>
          {t.business_name ? (
            <p className="text-sm text-muted-foreground">{t.business_name}</p>
          ) : null}
          {t.phone ? <p className="text-sm text-muted-foreground">{t.phone}</p> : null}
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Badge variant="secondary">{subscriptionPlanLabels[t.subscription_plan]}</Badge>
          <Badge
            variant={
              t.status === "active" ? subscriptionStatusVariants[t.subscription_status] : "destructive"
            }
          >
            {t.status === "active"
              ? subscriptionStatusLabels[t.subscription_status]
              : "Inactivo"}
          </Badge>
        </div>
      </div>

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

      <PlanManager
        profileId={t.id}
        currentPlan={t.subscription_plan}
        currentStatus={t.subscription_status}
        planSource={t.plan_source}
        planOverrideExpiresAt={t.plan_override_expires_at}
        plans={plans}
        changeLog={changeLog}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Sus clientes</CardTitle>
        </CardHeader>
        <CardContent>
          {clients.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Este entrenador todavía no tiene clientes.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {clients.map((client) => (
                <Link
                  key={client.id}
                  href={`/superadmin/clientes/${client.id}`}
                  className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5 transition-colors hover:bg-accent/40"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{client.full_name}</p>
                    <p className="truncate text-xs text-muted-foreground">{client.email}</p>
                  </div>
                  <Badge variant={client.status === "active" ? "success" : "destructive"}>
                    {client.status === "active" ? "Activo" : "Inactivo"}
                  </Badge>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        En la plataforma desde {formatDate(t.created_at.slice(0, 10))}
      </p>
    </div>
  );
}
