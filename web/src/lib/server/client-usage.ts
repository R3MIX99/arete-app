import type { SupabaseClient } from "@supabase/supabase-js";

import type { ClientUsage } from "@/lib/types/plans";

/**
 * Uso actual de clientes de un entrenador vs. el límite efectivo de su plan
 * (incluidos + bloques extra contratados). `limit` null = plan ilimitado.
 *
 * Todo sale de las funciones SQL de la Fase A (trainer_client_limit /
 * trainer_active_client_count), que son la única fuente de verdad del cálculo
 * — así la app y las políticas RLS nunca se contradicen.
 */
export async function fetchClientUsage(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>,
  trainerId: string,
): Promise<ClientUsage> {
  const [{ data: limit }, { data: activeClients }, { data: sub }] = await Promise.all([
    supabase.rpc("trainer_client_limit", { p_trainer_id: trainerId }),
    supabase.rpc("trainer_active_client_count", { p_trainer_id: trainerId }),
    supabase
      .from("trainer_subscription")
      .select("over_limit_grace_until")
      .eq("trainer_id", trainerId)
      .maybeSingle(),
  ]);

  return {
    activeClients: (activeClients as number | null) ?? 0,
    limit: (limit as number | null) ?? null,
    overLimitGraceUntil: (sub?.over_limit_grace_until as string | null) ?? null,
  };
}
