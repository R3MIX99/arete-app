import type { SubscriptionPlan } from "@/lib/types/settings";

/** Datos del propio cliente que se muestran y editan en su pestaña
 * Perfil. El correo va aparte porque no se puede cambiar desde aquí.
 * El cliente NO tiene plan propio — ver AssignedTrainer.subscription_plan:
 * las funciones que desbloquea un plan son del entrenador. */
export interface ClientProfileSettings {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  goal: string | null;
  health_notes: string | null;
  notify_workout_reminders: boolean;
  notify_meal_reminders: boolean;
  deletion_requested_at: string | null;
}

/** Entrenador asignado, tal como lo ve su cliente — solo lo necesario
 * para identificarlo, contactarlo, y saber qué plan tiene (que es el
 * que en la práctica determina qué funciones ve el cliente). */
export interface AssignedTrainer {
  full_name: string;
  email: string;
  phone: string | null;
  business_name: string | null;
  business_logo_path: string | null;
  subscription_plan: SubscriptionPlan;
}
