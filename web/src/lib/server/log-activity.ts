import type { SupabaseClient } from "@supabase/supabase-js";

import { parseUserAgent } from "@/lib/user-agent";
import type { ActivityLogCategory, ActivityLogSeverity } from "@/lib/types/activity-log";
import type { LogActivityInput } from "@/lib/log-activity";

/**
 * Versión de logActivity() para código que corre en el servidor (Route
 * Handlers, Server Actions) — ahí no hay `navigator` ni `performance.now()`
 * del navegador, así que en vez de eso se lee el header `user-agent` de la
 * petición original. Se usa, por ejemplo, en /auth/callback: ese salto
 * nunca pasa por una pantalla con logActivity() del lado del cliente,
 * porque el navegador va directo de Google de vuelta al servidor.
 *
 * Igual que la versión de cliente: nunca lanza. Un log que falla no debe
 * tumbar el login real del usuario.
 */
export async function logActivityServer(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>,
  request: Request,
  input: Omit<LogActivityInput, "startedAt"> & { startedAt?: number },
): Promise<void> {
  try {
    const ua = request.headers.get("user-agent");
    const durationMs =
      input.startedAt !== undefined ? Math.round(performance.now() - input.startedAt) : undefined;

    await supabase.rpc("log_activity", {
      p_action: input.action,
      p_category: input.category satisfies ActivityLogCategory,
      p_severity: (input.severity ?? "info") satisfies ActivityLogSeverity,
      p_message: input.message,
      p_target_type: input.targetType ?? null,
      p_target_id: input.targetId ?? null,
      p_target_label: input.targetLabel ?? null,
      p_context: {
        ...(input.context ?? {}),
        ...(ua ? { client: parseUserAgent(ua) } : {}),
        ...(durationMs !== undefined ? { durationMs } : {}),
      },
    });
  } catch {
    // Silencioso a propósito — ver el comentario de arriba.
  }
}
