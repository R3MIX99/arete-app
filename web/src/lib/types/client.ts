export type ClientGoal = "lose_weight" | "gain_muscle" | "maintenance" | "performance";
export type ClientStatus = "active" | "inactive";

export interface ClientProfile {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  goal: ClientGoal | null;
  health_notes: string | null;
  status: ClientStatus;
  created_at: string;
}

/** Un programa o rutina suelta asignada a un cliente — vista desde el
 * perfil del cliente, para no tener que entrar al programa/rutina y
 * buscarlo en su lista de clientes asignados. */
export interface ClientTrainingAssignment {
  id: string;
  start_date: string;
  is_program: boolean;
  program_id: string | null;
  program_name: string | null;
  program_duration_weeks: number | null;
  routine_id: string | null;
  routine_name: string | null;
}

export interface ClientDietPlanAssignment {
  id: string;
  start_date: string;
  diet_plan_id: string;
  diet_plan_name: string;
}

export interface PendingInvitation {
  id: string;
  email: string;
  full_name: string | null;
  goal: ClientGoal | null;
  status: string;
  token: string;
  created_at: string;
}
