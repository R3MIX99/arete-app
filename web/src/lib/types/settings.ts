export type SubscriptionPlan = "free" | "pro" | "studio";
export type SubscriptionStatus = "active" | "trialing" | "past_due" | "canceled";

export interface TrainerSettings {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  business_name: string | null;
  notify_email: boolean;
  notify_push: boolean;
  subscription_plan: SubscriptionPlan;
  subscription_status: SubscriptionStatus;
}

export const subscriptionPlanLabels: Record<SubscriptionPlan, string> = {
  free: "Free",
  pro: "Pro",
  studio: "Studio",
};

export const subscriptionStatusLabels: Record<SubscriptionStatus, string> = {
  active: "Activo",
  trialing: "En prueba",
  past_due: "Pago pendiente",
  canceled: "Cancelado",
};

export const subscriptionStatusVariants: Record<
  SubscriptionStatus,
  "success" | "warning" | "destructive"
> = {
  active: "success",
  trialing: "warning",
  past_due: "destructive",
  canceled: "destructive",
};
