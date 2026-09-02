import { createClient } from "@/lib/supabase/client";
import type { ActivityLogCategory, ActivityLogSeverity } from "@/lib/types/activity-log";

export interface LogActivityInput {
  /** Slug estable, ej. "auth.login", "trainer.client_deactivated". Se
   * agrupan por el prefijo antes del punto para el filtro de categoría,
   * pero `category` manda — el slug es solo para identificar la acción
   * en el detalle. */
  action: string;
  category: ActivityLogCategory;
  severity?: ActivityLogSeverity;
  /** Resumen en español, ya listo para la fila de la tabla. */
  message: string;
  targetType?: string;
  targetId?: string;
  targetLabel?: string;
  /** Lo demás: en qué pantalla, a qué le hizo clic, motivo del error,
   * código de estatus, etc. — forma libre. */
  context?: Record<string, unknown>;
}

/**
 * Registra un evento en la bitácora de /superadmin/logs. Siempre en
 * segundo plano y sin lanzar: un log que falla no debe tumbar la acción
 * real del usuario (activar un cliente, iniciar sesión, etc.) — por eso
 * no se espera (no `await` en el sitio de la llamada) y cualquier error
 * se traga en silencio.
 */
export function logActivity(input: LogActivityInput): void {
  const supabase = createClient();
  void supabase
    .rpc("log_activity", {
      p_action: input.action,
      p_category: input.category,
      p_severity: input.severity ?? "info",
      p_message: input.message,
      p_target_type: input.targetType ?? null,
      p_target_id: input.targetId ?? null,
      p_target_label: input.targetLabel ?? null,
      p_context: input.context ?? {},
    })
    .then(() => {
      // No hay nada que hacer con el resultado — ver el comentario de arriba.
    })
    .catch(() => {
      // Silencioso a propósito — ver el comentario de arriba.
    });
}
