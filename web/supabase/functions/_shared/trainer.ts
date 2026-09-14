import { createClient, type SupabaseClient } from "jsr:@supabase/supabase-js@2";
import { corsHeaders } from "./cors.ts";

const DAILY_LIMITS: Record<string, number> = {
  generate_routine: 15,
  generate_diet: 15,
  score_routine: 30,
};

function jsonError(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, "content-type": "application/json" },
  });
}

/**
 * Verifica que quien llama sea un entrenador autenticado (usando su
 * propio JWT, respetando RLS) y que no haya superado el límite diario de
 * uso de esta función de IA. Lanza la Response de error directamente si
 * algo falla, para que el handler solo tenga que `try { } catch (r) {
 * return r as Response }`.
 */
export async function requireTrainerWithinLimit(
  req: Request,
  feature: "generate_routine" | "generate_diet" | "score_routine",
): Promise<{ supabase: SupabaseClient; trainerId: string }> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) throw jsonError("No autorizado.", 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const supabase = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw jsonError("No autorizado.", 401);

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, subscription_plan")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "trainer") throw jsonError("Solo entrenadores pueden usar esta función.", 403);

  // El gate de plan hasta ahora solo vivía en la UI (routine-form.tsx,
  // routine-ai-score-card.tsx, new-diet-plan-form.tsx abrían PlansDialog
  // en vez del diálogo real si plan.hasAI era falso) — cualquiera que le
  // pegara directo a la función con un token válido de un plan Gratis/Pro
  // se la saltaba. Se repite aquí la misma regla (ai_generations_included
  // > 0) del lado del servidor, que es la que de verdad cuenta.
  const { data: plan } = await supabase
    .from("plans")
    .select("ai_generations_included")
    .eq("key", profile.subscription_plan ?? "free")
    .maybeSingle();
  if (!plan || (plan.ai_generations_included ?? 0) <= 0) {
    throw jsonError(
      "Esta función de inteligencia artificial no está incluida en tu plan actual. Sube a Estudio o Gym para usarla.",
      403,
    );
  }

  const limit = DAILY_LIMITS[feature];
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count } = await supabase
    .from("ai_usage_events")
    .select("id", { count: "exact", head: true })
    .eq("trainer_id", user.id)
    .eq("feature", feature)
    .gte("created_at", since);

  if ((count ?? 0) >= limit) {
    throw jsonError(
      `Alcanzaste el límite de ${limit} usos diarios de esta herramienta de IA. Vuelve a intentarlo mañana.`,
      429,
    );
  }

  return { supabase, trainerId: user.id };
}

export async function logAiUsage(
  supabase: SupabaseClient,
  trainerId: string,
  feature: "generate_routine" | "generate_diet" | "score_routine",
) {
  await supabase.from("ai_usage_events").insert({ trainer_id: trainerId, feature });
}

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "content-type": "application/json" },
  });
}

export { jsonError };
