import Link from "next/link";
import { Users, Dumbbell, Plus, Apple, UserPlus, ArrowRight } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default async function DashboardPage() {
  const supabase = await createClient();

  const [{ count: activeClients }, { count: routineCount }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "client")
      .eq("status", "active"),
    supabase.from("routines").select("id", { count: "exact", head: true }),
  ]);

  const stats = [
    { label: "Clientes activos", value: activeClients ?? 0, icon: Users },
    { label: "Rutinas creadas", value: routineCount ?? 0, icon: Dumbbell },
  ];

  const quickActions = [
    { label: "Crear rutina", href: "/entrenador/rutinas/nueva", icon: Plus },
    { label: "Crear dieta", href: "/entrenador/nutricion/nuevo", icon: Apple },
    { label: "Agregar cliente", href: "/entrenador/clientes/nuevo", icon: UserPlus },
  ];

  return (
    <div className="flex w-full flex-col gap-8 p-4 md:p-8">
      <section className="flex flex-col gap-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Resumen
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:max-w-md">
          {stats.map((stat) => (
            <Card key={stat.label}>
              <CardContent className="flex flex-col gap-3">
                <div className="flex size-9 items-center justify-center rounded-lg bg-primary/12 text-primary">
                  <stat.icon className="size-[18px]" />
                </div>
                <div>
                  <p className="text-2xl font-bold tracking-tight tabular-nums">
                    {stat.value}
                  </p>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
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

      <section className="flex flex-col gap-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Próximos pasos de la migración
        </h2>
        <Card>
          <CardContent className="flex flex-col gap-3 text-sm text-muted-foreground">
            <p>
              Este Dashboard ya lee datos reales de Supabase (clientes activos y
              rutinas creadas, respetando RLS). Las secciones de{" "}
              <span className="text-foreground font-medium">Sesiones de hoy</span>{" "}
              y <span className="text-foreground font-medium">Clientes sin actividad</span>{" "}
              se conectan en el siguiente módulo, junto con Clientes, Ejercicios,
              Rutinas y el resto del panel.
            </p>
            <Button variant="link" className="h-auto justify-start p-0" asChild>
              <Link href="/entrenador/clientes">
                Ir a Clientes <ArrowRight />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
