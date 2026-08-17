import { notFound } from "next/navigation";
import Link from "next/link";
import { Activity, ChevronLeft, Ruler, Target } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { formatDate, goalLabel } from "@/lib/format";
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

interface ClientRow {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  status: string;
  goal: string | null;
  health_notes: string | null;
  trainer_id: string | null;
  subscription_plan: SubscriptionPlan;
  subscription_status: SubscriptionStatus;
  plan_source: PlanSource;
  plan_override_expires_at: string | null;
  created_at: string;
}

interface SessionRow {
  id: string;
  session_date: string;
  duration_seconds: number | null;
  routines: { name: string } | { name: string }[] | null;
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

export default async function SuperadminClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: client }, { data: sessionRows }, { count: measurementCount }, { data: planRows }, { data: changeLogRows }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select(
          "id, full_name, email, phone, status, goal, health_notes, trainer_id, subscription_plan, subscription_status, plan_source, plan_override_expires_at, created_at",
        )
        .eq("id", id)
        .eq("role", "client")
        .maybeSingle(),
      supabase
        .from("client_sessions")
        .select("id, session_date, duration_seconds, routines(name)")
        .eq("client_id", id)
        .eq("status", "completed")
        .order("session_date", { ascending: false })
        .limit(10),
      supabase
        .from("progress_measurements")
        .select("id", { count: "exact", head: true })
        .eq("client_id", id),
      supabase
        .from("plans")
        .select("id, key, name, price_cents, currency, client_limit, features, is_active, sort_order")
        .eq("is_active", true)
        .order("sort_order"),
      supabase
        .from("plan_change_log")
        .select(
          "id, previous_plan, new_plan, previous_status, new_status, is_free_grant, expires_at, note, changed_by, changed_at, changed_by_profile:changed_by(full_name)",
        )
        .eq("profile_id", id)
        .order("changed_at", { ascending: false }),
    ]);

  if (!client) notFound();
  const c = client as ClientRow;
  const sessions = (sessionRows ?? []) as unknown as SessionRow[];
  const plans = (planRows ?? []) as PlanCatalogEntry[];
  const changeLog: PlanChangeLogEntry[] = ((changeLogRows ?? []) as ChangeLogRow[]).map((row) => ({
    ...row,
    changed_by_name: one(row.changed_by_profile)?.full_name ?? null,
  }));

  const { data: trainer } = c.trainer_id
    ? await supabase
        .from("profiles")
        .select("id, full_name")
        .eq("id", c.trainer_id)
        .maybeSingle()
    : { data: null };

  const stats = [
    { label: "Entrenamientos", value: sessions.length, icon: Activity },
    { label: "Mediciones", value: measurementCount ?? 0, icon: Ruler },
  ];

  return (
    <div className="flex w-full flex-col gap-5 p-4 md:p-8">
      <Link
        href="/superadmin/clientes"
        className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" /> Volver a clientes
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold">{c.full_name}</h1>
          <p className="text-sm text-muted-foreground">{c.email}</p>
          {c.phone ? <p className="text-sm text-muted-foreground">{c.phone}</p> : null}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {c.goal ? (
            <Badge variant="secondary">
              <Target className="size-3" /> {goalLabel(c.goal)}
            </Badge>
          ) : null}
          <Badge variant="secondary">{subscriptionPlanLabels[c.subscription_plan]}</Badge>
          <Badge
            variant={
              c.status === "active" ? subscriptionStatusVariants[c.subscription_status] : "destructive"
            }
          >
            {c.status === "active" ? subscriptionStatusLabels[c.subscription_status] : "Inactivo"}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Entrenador</CardTitle>
          </CardHeader>
          <CardContent>
            {trainer ? (
              <Link
                href={`/superadmin/entrenadores/${trainer.id}`}
                className="text-sm font-medium text-primary hover:underline"
              >
                {trainer.full_name}
              </Link>
            ) : (
              <p className="text-sm text-muted-foreground">Sin entrenador asignado.</p>
            )}
          </CardContent>
        </Card>

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
        profileId={c.id}
        currentPlan={c.subscription_plan}
        currentStatus={c.subscription_status}
        planSource={c.plan_source}
        planOverrideExpiresAt={c.plan_override_expires_at}
        plans={plans}
        changeLog={changeLog}
      />

      {c.health_notes ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Notas de salud</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{c.health_notes}</p>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Últimos entrenamientos</CardTitle>
        </CardHeader>
        <CardContent>
          {sessions.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Este cliente todavía no ha completado ningún entrenamiento.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5"
                >
                  <span className="min-w-0 truncate text-sm font-medium">
                    {one(session.routines)?.name ?? "Rutina"}
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {formatDate(session.session_date)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        En la plataforma desde {formatDate(c.created_at.slice(0, 10))}
      </p>
    </div>
  );
}
