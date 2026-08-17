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

export default async function SuperadminClientsPage() {
  const supabase = await createClient();

  const { data } = await supabase
    .from("profiles")
    .select(
      "id, full_name, email, role, status, trainer_id, subscription_plan, subscription_status, created_at",
    )
    .order("full_name");

  const profiles = (data ?? []) as ProfileRow[];
  const trainerNameById = new Map(
    profiles.filter((p) => p.role === "trainer").map((t) => [t.id, t.full_name]),
  );

  const clients: PersonRow[] = profiles
    .filter((p) => p.role === "client")
    .map((c) => ({
      id: c.id,
      full_name: c.full_name,
      email: c.email,
      status: c.status,
      created_at: c.created_at,
      subscription_plan: c.subscription_plan,
      subscription_status: c.subscription_status,
      // trainer_id puede quedar en null si su entrenador se elimina.
      secondary: c.trainer_id
        ? (trainerNameById.get(c.trainer_id) ?? "Entrenador")
        : "Sin entrenador",
    }));

  return (
    <div className="flex w-full flex-col gap-5 p-4 md:p-8">
      <div>
        <h1 className="text-xl font-semibold">Clientes</h1>
        <p className="text-sm text-muted-foreground">
          Todos los clientes registrados en la plataforma.
        </p>
      </div>

      <PeopleTable
        people={clients}
        detailHrefBase="/superadmin/clientes"
        secondaryLabel="Entrenador"
        emptyMessage="Todavía no hay clientes registrados."
      />
    </div>
  );
}
