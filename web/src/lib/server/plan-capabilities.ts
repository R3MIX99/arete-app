import type { SupabaseClient } from "@supabase/supabase-js";

import { fetchClientUsage } from "@/lib/server/client-usage";
import type { PlanCapabilities } from "@/lib/types/plans";
import type { SubscriptionPlan } from "@/lib/types/settings";

/**
 * Qué puede hacer el entrenador según su plan: si tiene IA, si tiene marca
 * propia, y su uso de clientes vs. el límite. Se llama una vez en el layout
 * del panel y se comparte por contexto (PlanCapabilitiesProvider).
 */
export async function fetchPlanCapabilities(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>,
  trainerId: string,
): Promise<PlanCapabilities> {
  const [{ data: profile }, usage] = await Promise.all([
    supabase.from("profiles").select("subscription_plan").eq("id", trainerId).single(),
    fetchClientUsage(supabase, trainerId),
  ]);

  const planKey = ((profile?.subscription_plan as SubscriptionPlan | null) ??
    "free") as SubscriptionPlan;

  const { data: plan } = await supabase
    .from("plans")
    .select("ai_generations_included")
    .eq("key", planKey)
    .maybeSingle();

  return {
    planKey,
    hasAI: ((plan?.ai_generations_included as number | null) ?? 0) > 0,
    hasBranding: planKey === "studio" || planKey === "gym",
    clientLimit: usage.limit,
    activeClients: usage.activeClients,
    overLimitGraceUntil: usage.overLimitGraceUntil,
  };
}
