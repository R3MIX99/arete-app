import Link from "next/link";
import { Users, UserRound, Dumbbell, Activity } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/format";
import { subscriptionPlanLabels, type SubscriptionPlan } from "@/lib/types/settings";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProgressLineChart } from "@/components/trainer/progress-line-chart";
import { BarList, type BarItem } from "@/components/superadmin/bar-list";

interface ProfileRow {
  id: string;
  full_name: string;
  email: string;
  role: string;
  status: string;
  trainer_id: string | null;
  subscription_plan: SubscriptionPlan;
  created_at: string;
}

interface SessionRow {
  id: string;
  client_id: string;
  session_date: string;
  finished_at: string | null;
  status: string;
}

const MONTH_LABELS = [
  "ene",
  "feb",
  "mar",
  "abr",
  "may",
  "jun",
  "jul",
  "ago",
  "sep",
  "oct",
  "nov",
  "dic",
];

/** "2026-08-16..." → "ago 26", que es lo que se lee en el eje. */
function monthLabel(iso: string): string {
  const [year, month] = iso.slice(0, 7).split("-").map(Number);
  return `${MONTH_LABELS[month - 1]} ${String(year).slice(2)}`;
}

export default async function SuperadminDashboardPage() {
  const supabase = await createClient();

  const [{ data: profileRows }, { count: routineCount }, { data: sessionRows }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("id, full_name, email, role, status, trainer_id, subscription_plan, created_at")
        .order("created_at"),
      supabase.from("routines").select("id", { count: "exact", head: true }),
      supabase
        .from("client_sessions")
        .select("id, client_id, session_date, finished_at, status")
        .eq("status", "completed")
        .order("finished_at", { ascending: false })
        .limit(200),
    ]);

  const profiles = (profileRows ?? []) as ProfileRow[];
  const sessions = (sessionRows ?? []) as SessionRow[];

  const trainers = profiles.filter((p) => p.role === "trainer");
  const clients = profiles.filter((p) => p.role === "client");
  const activeTrainers = trainers.filter((t) => t.status === "active");
  const activeClients = clients.filter((c) => c.status === "active");

  // Crecimiento: altas acumuladas por mes. Se acumula (y no altas
  // sueltas) porque lo que interesa es cómo crece la plataforma, no el
  // ruido mes a mes.
  const monthKeys = Array.from(new Set(profiles.map((p) => p.created_at.slice(0, 7)))).sort();
  let runningTrainers = 0;
  let runningClients = 0;
  const trainerGrowth: { label: string; value: number }[] = [];
  const clientGrowth: { label: string; value: number }[] = [];
  for (const key of monthKeys) {
    runningTrainers += trainers.filter((t) => t.created_at.slice(0, 7) === key).length;
    runningClients += clients.filter((c) => c.created_at.slice(0, 7) === key).length;
    const label = monthLabel(key);
    trainerGrowth.push({ label, value: runningTrainers });
    clientGrowth.push({ label, value: runningClients });
  }

  const clientsByTrainer = new Map<string, number>();
  for (const client of clients) {
    if (!client.trainer_id) continue;
    clientsByTrainer.set(client.trainer_id, (clientsByTrainer.get(client.trainer_id) ?? 0) + 1);
  }
  const topTrainers: BarItem[] = trainers
    .map((t) => ({ label: t.full_name, value: clientsByTrainer.get(t.id) ?? 0 }))
    .filter((t) => t.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  // Los planes se cuentan solo entre entrenadores: es quien paga la
  // suscripción — el cliente entra por invitación de su entrenador.
  const planCounts = new Map<SubscriptionPlan, number>();
  for (const trainer of trainers) {
    planCounts.set(trainer.subscription_plan, (planCounts.get(trainer.subscription_plan) ?? 0) + 1);
  }
  const plansUsed: BarItem[] = (Object.keys(subscriptionPlanLabels) as SubscriptionPlan[])
    .map((plan) => ({
      label: subscriptionPlanLabels[plan],
      value: planCounts.get(plan) ?? 0,
    }))
    .filter((p) => p.value > 0);

  const nameById = new Map(profiles.map((p) => [p.id, p.full_name]));
  const recentActivity = sessions.slice(0, 8).map((s) => ({
    id: s.id,
    clientName: nameById.get(s.client_id) ?? "Cliente",
    date: s.session_date,
  }));

  // Entrenamientos completados por mes: la señal de que la plataforma se
  // está usando de verdad, no solo de que hay cuentas creadas.
  const sessionsByMonth = new Map<string, number>();
  for (const session of sessions) {
    const key = session.session_date.slice(0, 7);
    sessionsByMonth.set(key, (sessionsByMonth.get(key) ?? 0) + 1);
  }
  const sessionActivity = Array.from(sessionsByMonth.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => ({ label: monthLabel(key), value }));

  const stats = [
    { label: "Entrenadores activos", value: activeTrainers.length, icon: Users },
    { label: "Clientes activos", value: activeClients.length, icon: UserRound },
    { label: "Rutinas creadas", value: routineCount ?? 0, icon: Dumbbell },
    { label: "Entrenamientos completados", value: sessions.length, icon: Activity },
  ];

  return (
    <div className="flex w-full flex-col gap-8 p-4 md:p-8">
      <section className="flex flex-col gap-3">
        <h2 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          Resumen de la plataforma
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

      <section className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Crecimiento de entrenadores</CardTitle>
          </CardHeader>
          <CardContent>
            <ProgressLineChart
              points={trainerGrowth}
              emptyMessage="Todavía no hay entrenadores registrados."
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Crecimiento de clientes</CardTitle>
          </CardHeader>
          <CardContent>
            <ProgressLineChart
              points={clientGrowth}
              emptyMessage="Todavía no hay clientes registrados."
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Entrenadores con más clientes</CardTitle>
          </CardHeader>
          <CardContent>
            <BarList
              items={topTrainers}
              emptyMessage="Ningún entrenador tiene clientes todavía."
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Planes más usados</CardTitle>
          </CardHeader>
          <CardContent>
            <BarList
              items={plansUsed}
              emptyMessage="Todavía no hay planes asignados."
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Entrenamientos completados por mes</CardTitle>
          </CardHeader>
          <CardContent>
            <ProgressLineChart
              points={sessionActivity}
              emptyMessage="Todavía no hay entrenamientos completados."
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Actividad reciente</CardTitle>
          </CardHeader>
          <CardContent>
            {recentActivity.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Todavía no hay actividad en la plataforma.
              </p>
            ) : (
              <div className="flex flex-col gap-2.5">
                {recentActivity.map((item) => (
                  <div key={item.id} className="flex items-center justify-between gap-3 text-sm">
                    <span className="min-w-0 truncate">
                      <span className="font-medium">{item.clientName}</span> completó un
                      entrenamiento
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {formatDate(item.date)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="flex flex-wrap gap-2">
        <Link
          href="/superadmin/entrenadores"
          className="text-sm font-medium text-primary hover:underline"
        >
          Ver todos los entrenadores
        </Link>
        <span className="text-sm text-muted-foreground">·</span>
        <Link
          href="/superadmin/clientes"
          className="text-sm font-medium text-primary hover:underline"
        >
          Ver todos los clientes
        </Link>
      </section>
    </div>
  );
}
