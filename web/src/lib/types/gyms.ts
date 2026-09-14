export type GymRole = "admin" | "supervisor" | "trainer" | "nutritionist" | "assistant";

export const gymRoleLabels: Record<GymRole, string> = {
  admin: "Administrador",
  supervisor: "Supervisor",
  trainer: "Entrenador",
  nutritionist: "Nutriólogo",
  assistant: "Asistente",
};

export interface Gym {
  id: string;
  owner_id: string;
  name: string;
  created_at: string;
}

export interface GymMember {
  gym_id: string;
  profile_id: string;
  role: GymRole;
  status: "active" | "invited" | "removed";
  invited_by: string | null;
  joined_at: string | null;
  created_at: string;
}
