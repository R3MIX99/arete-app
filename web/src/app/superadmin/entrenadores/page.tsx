import { createClient } from "@/lib/supabase/server";
import { PeopleTable, type PersonRow } from "@/components/superadmin/people-table";
import type { SubscriptionPlan, SubscriptionStatus } from "@/lib/types/settings";

interface ProfileRow {
  id: string;
  full_name: string;
  email: string;
  role: string;
  status: string;
  trainer_id: string | null;
  subscription_plan: SubscriptionPlan;
  subscription_status: SubscriptionStatus;
  created_at: string;
}

export default async function SuperadminTrainersPage() {
  const supabase = await createClient();

  const { data } = await supabase
    .from("profiles")
    .select(
      "id, full_name, email, role, status, trainer_id, subscription_plan, subscription_status, created_at",
    )
    .order("full_name");

  const profiles = (data ?? []) as ProfileRow[];

  // El conteo de clientes se arma aquí y no con una consulta agregada
  // aparte: ya se traen todos los perfiles para el listado, así que
  // contar en memoria evita un segundo viaje a la base.
  const clientsByTrainer = new Map<string, number>();
  for (const p of profiles) {
    if (p.role !== "client" || !p.trainer_id) continue;
    clientsByTrainer.set(p.trainer_id, (clientsByTrainer.get(p.trainer_id) ?? 0) + 1);
  }

  const trainers: PersonRow[] = profiles
    .filter((p) => p.role === "trainer")
    .map((t) => {
      const count = clientsByTrainer.get(t.id) ?? 0;
      return {
        id: t.id,
        full_name: t.full_name,
        email: t.email,
        status: t.status,
        created_at: t.created_at,
        subscription_plan: t.subscription_plan,
        subscription_status: t.subscription_status,
        secondary: count === 1 ? "1 cliente" : `${count} clientes`,
        clientCount: count,
      };
    });

  return (
    <div className="flex w-full flex-col gap-5 p-4 md:p-8">
      <div>
        <h1 className="text-xl font-semibold">Entrenadores</h1>
        <p className="text-sm text-muted-foreground">
          Todos los entrenadores registrados en la plataforma.
        </p>
      </div>

      <PeopleTable
        people={trainers}
        detailHrefBase="/superadmin/entrenadores"
        secondaryLabel="Clientes"
        emptyMessage="Todavía no hay entrenadores registrados."
      />
    </div>
  );
}
