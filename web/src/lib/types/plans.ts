import type { SubscriptionPlan, SubscriptionStatus } from "@/lib/types/settings";

export interface PlanCatalogEntry {
  id: string;
  key: SubscriptionPlan;
  name: string;
  price_cents: number;
  currency: string;
  /** @deprecated usar included_clients — se conserva por compatibilidad. */
  client_limit: number | null;
  /** Clientes incluidos en el plan. null = ilimitado. */
  included_clients: number | null;
  /** Tamaño del bloque de clientes extra (5). */
  extra_block_size: number;
  /** Precio mensual del bloque extra. null = el plan no admite extra (tope duro). */
  extra_block_price_cents: number | null;
  /** Empleados (seats) incluidos — solo Gym trae más de 1. */
  included_seats: number;
  /** Precio mensual por seat extra — solo Gym. */
  extra_seat_price_cents: number | null;
  ai_generations_included: number;
  ai_extra_pack_size: number;
  ai_extra_pack_price_cents: number | null;
  features: string[];
  is_active: boolean;
  sort_order: number;
}

/** Extras contratados por un entrenador por encima del mínimo de su plan. */
export interface TrainerSubscription {
  trainer_id: string;
  plan_key: SubscriptionPlan;
  extra_client_blocks: number;
  extra_seats: number;
  ai_extra_packs: number;
  /** Si está puesta, el entrenador se pasó del límite (bajó de plan) y tiene
   *  hasta esta fecha para ajustar. Se limpia sola al volver a estar dentro. */
  over_limit_grace_until: string | null;
}

/** Uso actual de clientes de un entrenador vs. su límite efectivo. */
export interface ClientUsage {
  activeClients: number;
  /** included_clients + extra_client_blocks * 5. null = ilimitado. */
  limit: number | null;
  overLimitGraceUntil: string | null;
}

export type PlanSource = "default" | "manual" | "stripe";

export const planSourceLabels: Record<PlanSource, string> = {
  default: "Plan por defecto",
  manual: "Cambio manual",
  stripe: "Pago con Stripe",
};

export interface PlanChangeLogEntry {
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
  changed_by_name?: string | null;
}

export interface SuperadminSetPlanInput {
  profileId: string;
  planKey: SubscriptionPlan;
  status: SubscriptionStatus;
  isFreeGrant: boolean;
  expiresAt: string | null;
  note: string | null;
}
