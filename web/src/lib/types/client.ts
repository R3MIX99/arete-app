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

export interface PendingInvitation {
  id: string;
  email: string;
  full_name: string | null;
  goal: ClientGoal | null;
  status: string;
  token: string;
  created_at: string;
}
