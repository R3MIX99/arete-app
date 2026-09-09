/** Datos del propio cliente que se muestran y editan en su pestaña
 * Perfil. El correo va aparte porque no se puede cambiar desde aquí. */
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
 * para identificarlo y contactarlo. No incluye el plan de suscripción
 * del entrenador: el cliente no debe saber en qué plan está. */
export interface AssignedTrainer {
  full_name: string;
  email: string;
  phone: string | null;
  business_name: string | null;
  business_logo_path: string | null;
}
