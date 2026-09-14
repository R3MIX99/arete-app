import Link from "next/link";
import { Building2 } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/format";
import type { Gym } from "@/lib/types/gyms";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CreateGymDialog } from "@/components/superadmin/create-gym-dialog";

interface TrainerOption {
  id: string;
  full_name: string;
  email: string;
}

export default async function SuperadminGymsPage() {
  const supabase = await createClient();

  const [{ data: gymRows }, { data: memberRows }, { data: clientCountRows }, { data: trainerRows }] =
    await Promise.all([
      supabase
        .from("gyms")
        .select("id, owner_id, name, created_at, owner:owner_id(full_name, email)")
        .order("created_at", { ascending: false }),
      supabase.from("gym_members").select("gym_id").eq("status", "active"),
      supabase.from("profiles").select("gym_id").eq("role", "client").not("gym_id", "is", null),
      // Solo entrenadores sin gimnasio todavía pueden ser elegidos como
      // dueño al crear uno nuevo — superadmin_create_gym rechaza a quien
      // ya sea dueño de otro, y un entrenador solo puede pertenecer a un
      // gimnasio en la práctica de hoy.
      supabase.from("profiles").select("id, full_name, email").eq("role", "trainer").is("gym_id", null).order("full_name"),
    ]);

  const memberCountByGym = new Map<string, number>();
  for (const row of memberRows ?? []) {
    memberCountByGym.set(row.gym_id, (memberCountByGym.get(row.gym_id) ?? 0) + 1);
  }
  const clientCountByGym = new Map<string, number>();
  for (const row of clientCountRows ?? []) {
    if (!row.gym_id) continue;
    clientCountByGym.set(row.gym_id, (clientCountByGym.get(row.gym_id) ?? 0) + 1);
  }

  interface GymRow extends Gym {
    owner: { full_name: string; email: string } | { full_name: string; email: string }[] | null;
  }

  const gyms = (gymRows ?? []) as GymRow[];
  const trainerOptions = (trainerRows ?? []) as TrainerOption[];

  return (
    <div className="flex w-full flex-col gap-5 p-4 md:p-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Gimnasios</h1>
          <p className="text-sm text-muted-foreground">
            Equipos del plan Gym — un administrador, sus empleados, y una bolsa de clientes
            compartida.
          </p>
        </div>
        <CreateGymDialog trainerOptions={trainerOptions} />
      </div>

      {gyms.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
            <Building2 className="size-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Todavía no hay ningún gimnasio creado.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {gyms.map((gym) => {
            const owner = Array.isArray(gym.owner) ? gym.owner[0] : gym.owner;
            return (
              <Link key={gym.id} href={`/superadmin/gimnasios/${gym.id}`}>
                <Card className="h-full transition-colors hover:border-primary/50">
                  <CardContent className="flex flex-col gap-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate font-medium">{gym.name}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {owner?.full_name ?? "Sin dueño"}
                        </p>
                      </div>
                      <Badge variant="secondary">Gym</Badge>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      <Badge variant="outline">
                        {memberCountByGym.get(gym.id) ?? 0} empleados
                      </Badge>
                      <Badge variant="outline">
                        {clientCountByGym.get(gym.id) ?? 0} clientes
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Creado el {formatDate(gym.created_at.slice(0, 10))}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
