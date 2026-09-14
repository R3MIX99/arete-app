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

/** GymMember + los datos del profile que casi siempre se necesitan
 *  junto (nombre, correo) — lo que de verdad consume la UI del equipo. */
export interface GymMemberWithProfile extends GymMember {
  full_name: string;
  email: string;
}

export type GymInvitationStatus = "pending" | "accepted" | "expired" | "revoked";

export const gymInvitationStatusLabels: Record<GymInvitationStatus, string> = {
  pending: "Pendiente",
  accepted: "Aceptada",
  expired: "Vencida",
  revoked: "Revocada",
};

export interface GymInvitation {
  id: string;
  gym_id: string;
  token: string;
  email: string;
  invited_role: GymRole;
  status: GymInvitationStatus;
  invited_by: string;
  expires_at: string;
  created_at: string;
  accepted_at: string | null;
}
