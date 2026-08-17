import type { SubscriptionPlan, SubscriptionStatus } from "@/lib/types/settings";

export interface PlanCatalogEntry {
  id: string;
  key: SubscriptionPlan;
  name: string;
  price_cents: number;
  currency: string;
  client_limit: number | null;
  features: string[];
  is_active: boolean;
  sort_order: number;
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
