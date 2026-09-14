import type { GymRole } from "@/lib/types/gyms";

/** Lo que el panel del entrenador necesita saber sobre su gimnasio (si
 *  pertenece a uno) — se resuelve una vez en el layout y se comparte por
 *  contexto, igual que PlanCapabilities. */
export interface GymContext {
  gymId: string;
  gymName: string;
  /** Rol del usuario actual dentro de este gimnasio. */
  role: GymRole;
  /** admin o supervisor — puede ver/gestionar a todo el equipo y
   *  reasignar clientes (matriz de permisos de la Fase D). */
  isManager: boolean;
  /** Solo admin invita, cambia roles y quita gente (matriz D3). */
  isAdmin: boolean;
  seatLimit: number | null;
  seatUsed: number;
}
