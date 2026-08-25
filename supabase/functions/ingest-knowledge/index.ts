import { createClient, type SupabaseClient } from "jsr:@supabase/supabase-js@2";
import { Buffer } from "node:buffer";
import { corsHeaders } from "./_shared/cors.ts";
import { embedTexts } from "./_shared/voyage.ts";

interface IngestRequest {
  sourceId: string;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "content-type": "application/json" },
  });
}

/** El superadmin llama esto con su propia sesión — no hace falta la
 * llave de servicio: las policies de knowledge_sources/chunks ya le dan
 * acceso total a ese rol, y el bucket privado también lo deja pasar. */
async function requireSuperadmin(req: Request): Promise<SupabaseClient> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) throw jsonResponse({ error: "No autorizado." }, 401);

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw jsonResponse({ error: "No autorizado." }, 401);

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "superadmin") throw jsonResponse({ error: "Solo el superadmin puede hacer esto." }, 403);

  return supabase;
}

/** pdf-parse y mammoth solo se cargan si hace falta — así un .txt no
 * paga el costo de esas dependencias. Si la extracción falla (el PDF
 * viene escaneado como imagen, es un formato raro, etc.), no se cae
 * la Edge Function: se marca la fuente en error y el superadmin puede
 * pegar el texto a mano en `raw_text`, que es justo por lo que esa
 * columna existe como camino principal y no solo de respaldo. */
async function extractDocumentText(bytes: Uint8Array, path: string): Promise<string> {
  const lower = path.toLowerCase();
  const buffer = Buffer.from(bytes);

  if (lower.endsWith(".pdf")) {
    const pdfParseModule = await import("npm:pdf-parse@1.1.1");
    const pdfParse = pdfParseModule.default ?? pdfParseModule;
    const result = await pdfParse(buffer);
    return result.text as string;
  }
  if (lower.endsWith(".docx")) {
    const mammoth = await import("npm:mammoth@1.8.0");
    const result = await mammoth.extractRawText({ buffer });
    return result.value as string;
  }
  // .txt, .md, o cualquier otro — se asume texto plano.
  return new TextDecoder("utf-8").decode(bytes);
}

/** Transcripción automática de YouTube vía el endpoint público de
 * subtítulos — no hay API oficial sin costo para esto. Es
 * best-effort: muchos videos no tienen subtítulos o YouTube cambia el
 * endpoint sin aviso. Si falla, se le pide al superadmin pegar la
 * transcripción a mano (mismo camino que un documento). */
async function fetchYoutubeTranscript(url: string): Promise<string | null> {
  const idMatch = url.match(/(?:v=|youtu\.be\/|shorts\/)([a-zA-Z0-9_-]{11})/);
  const videoId = idMatch?.[1];
  if (!videoId) return null;

  try {
    const listRes = await fetch(
      `https://video.google.com/timedtext?type=list&v=${videoId}`,
    );
    if (!listRes.ok) return null;
    const listXml = await listRes.text();
    const langMatch = listXml.match(/lang_code="([^"]+)"/);
    const lang = langMatch?.[1] ?? "es";

    const transcriptRes = await fetch(
      `https://video.google.com/timedtext?lang=${lang}&v=${videoId}`,
    );
    if (!transcriptRes.ok) return null;
    const xml = await transcriptRes.text();
    const texts = [...xml.matchAll(/<text[^>]*>([^<]*)<\/text>/g)].map((m) =>
      m[1]
        .replace(/&#39;/g, "'")
        .replace(/&amp;/g, "&")
        .replace(/&quot;/g, '"'),
    );
    const joined = texts.join(" ").trim();
    return joined || null;
  } catch {
    return null;
  }
}

interface RoutineExerciseJoinRow {
  order_index: number;
  notes: string | null;
  exercises: { name: string; muscle_group: string; equipment: string } | { name: string; muscle_group: string; equipment: string }[] | null;
  routine_exercise_sets: {
    set_number: number;
    target_reps_min: number | null;
    target_reps_max: number | null;
    rest_seconds: number | null;
    target_minutes: number | null;
  }[];
}

function one<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

async function buildRoutineText(supabase: SupabaseClient, routineId: string): Promise<string> {
  const [{ data: routine }, { data: exerciseRows }] = await Promise.all([
    supabase.from("routines").select("name, description, level, goal").eq("id", routineId).single(),
    supabase
      .from("routine_exercises")
      .select(
        "order_index, notes, exercises(name, muscle_group, equipment), routine_exercise_sets(set_number, target_reps_min, target_reps_max, rest_seconds, target_minutes)",
      )
      .eq("routine_id", routineId)
      .order("order_index"),
  ]);
  if (!routine) return "";

  const lines = [
    `Rutina de referencia: ${routine.name}`,
    routine.description ? `Descripción: ${routine.description}` : "",
    `Nivel: ${routine.level}`,
    routine.goal ? `Objetivo: ${routine.goal}` : "",
    "Ejercicios:",
  ];
  for (const row of (exerciseRows ?? []) as RoutineExerciseJoinRow[]) {
    const exercise = one(row.exercises);
    const setsText = row.routine_exercise_sets
      .map((s) =>
        s.target_minutes != null
          ? `serie ${s.set_number}: ${s.target_minutes} min`
          : `serie ${s.set_number}: ${s.target_reps_min}-${s.target_reps_max} reps, descanso ${s.rest_seconds ?? "?"}s`,
      )
      .join("; ");
    lines.push(
      `- ${exercise?.name ?? "Ejercicio"} (${exercise?.muscle_group ?? ""}, equipo: ${exercise?.equipment ?? ""}): ${setsText}${row.notes ? ` — ${row.notes}` : ""}`,
    );
  }
  return lines.filter(Boolean).join("\n");
}

interface DietMealJoinRow {
  order_index: number;
  quantity_grams: number | null;
  dishes: { name: string } | { name: string }[] | null;
  foods: { name: string } | { name: string }[] | null;
}

async function buildDietText(supabase: SupabaseClient, dietPlanId: string): Promise<string> {
  const [{ data: plan }, { data: mealRows }] = await Promise.all([
    supabase
      .from("diet_plans")
      .select("name, goal_label, daily_calorie_target")
      .eq("id", dietPlanId)
      .single(),
    supabase
      .from("diet_plan_meals")
      .select("order_index, quantity_grams, dishes(name), foods(name)")
      .eq("diet_plan_id", dietPlanId)
      .order("order_index"),
  ]);
  if (!plan) return "";

  const lines = [
    `Plan nutricional de referencia: ${plan.name}`,
    plan.goal_label ? `Objetivo: ${plan.goal_label}` : "",
    plan.daily_calorie_target ? `Meta calórica diaria: ${plan.daily_calorie_target} kcal` : "",
    "Comidas:",
  ];
  for (const row of (mealRows ?? []) as DietMealJoinRow[]) {
    const dish = one(row.dishes);
    const food = one(row.foods);
    if (dish) lines.push(`- ${dish.name}`);
    else if (food) lines.push(`- ${food.name}${row.quantity_grams ? ` (${row.quantity_grams} g)` : ""}`);
  }
  return lines.filter(Boolean).join("\n");
}

/** Divide en fragmentos de ~1400 caracteres con 200 de traslape, para
 * que una idea que cae justo en el corte no se pierda del todo del
 * lado que quede. */
function chunkText(text: string, maxChars = 1400, overlap = 200): string[] {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return [];
  if (clean.length <= maxChars) return [clean];

  const chunks: string[] = [];
  let start = 0;
  while (start < clean.length) {
    const end = Math.min(start + maxChars, clean.length);
    chunks.push(clean.slice(start, end));
    if (end >= clean.length) break;
    start = end - overlap;
  }
  return chunks;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = await requireSuperadmin(req);
    const body = (await req.json()) as IngestRequest;
    if (!body.sourceId) return jsonResponse({ error: "Falta sourceId." }, 400);

    const { data: source } = await supabase
      .from("knowledge_sources")
      .select("id, title, content_type, source_url, storage_path, raw_text, source_routine_id, source_diet_plan_id")
      .eq("id", body.sourceId)
      .single();
    if (!source) return jsonResponse({ error: "No se encontró esa fuente." }, 404);

    await supabase
      .from("knowledge_sources")
      .update({ status: "processing", error_message: null })
      .eq("id", source.id);

    async function fail(message: string) {
      await supabase.from("knowledge_sources").update({ status: "error", error_message: message }).eq("id", source.id);
      return jsonResponse({ error: message }, 422);
    }

    let text = (source.raw_text ?? "").trim();

    if (!text && source.content_type === "routine" && source.source_routine_id) {
      text = await buildRoutineText(supabase, source.source_routine_id);
    } else if (!text && source.content_type === "diet" && source.source_diet_plan_id) {
      text = await buildDietText(supabase, source.source_diet_plan_id);
    } else if (!text && source.content_type === "document" && source.storage_path) {
      const { data: fileBlob, error: downloadError } = await supabase.storage
        .from("knowledge-documents")
        .download(source.storage_path);
      if (downloadError || !fileBlob) {
        return await fail("No se pudo descargar el documento subido.");
      }
      const bytes = new Uint8Array(await fileBlob.arrayBuffer());
      try {
        text = (await extractDocumentText(bytes, source.storage_path)).trim();
      } catch (err) {
        console.error("extractDocumentText falló:", err);
        return await fail(
          "No se pudo leer el texto de este documento automáticamente (puede ser un PDF escaneado como imagen). Pega el texto a mano en 'Contenido' y vuelve a procesar.",
        );
      }
    } else if (!text && source.content_type === "video" && source.source_url) {
      const transcript = await fetchYoutubeTranscript(source.source_url);
      text = transcript?.trim() ?? "";
      if (!text) {
        return await fail(
          "No se pudo sacar la transcripción automática de este video (puede no tener subtítulos). Pega la transcripción a mano en 'Contenido' y vuelve a procesar.",
        );
      }
    }

    if (!text) {
      return await fail("No hay contenido que procesar — sube un archivo, pega texto, o elige una rutina/dieta de referencia.");
    }

    const chunks = chunkText(text);
    if (chunks.length === 0) {
      return await fail("El contenido quedó vacío después de limpiarlo.");
    }

    const apiKey = Deno.env.get("VOYAGE_API_KEY");
    if (!apiKey) return await fail("Falta configurar VOYAGE_API_KEY para generar los embeddings.");

    // En tandas de 16 — Voyage acepta lotes grandes, pero así un
    // documento enorme no manda una sola petición gigantesca.
    const embeddings: number[][] = [];
    for (let i = 0; i < chunks.length; i += 16) {
      const batch = chunks.slice(i, i + 16);
      const batchEmbeddings = await embedTexts({ apiKey, texts: batch, inputType: "document" });
      embeddings.push(...batchEmbeddings);
    }

    // Reprocesar borra los fragmentos viejos antes de meter los nuevos
    // — así "Reprocesar" en el panel es idempotente.
    await supabase.from("knowledge_chunks").delete().eq("source_id", source.id);

    const rows = chunks.map((content, i) => ({
      source_id: source.id,
      chunk_index: i,
      content,
      embedding: embeddings[i],
    }));
    const { error: insertError } = await supabase.from("knowledge_chunks").insert(rows);
    if (insertError) {
      console.error(insertError);
      return await fail("Se generaron los fragmentos pero no se pudieron guardar.");
    }

    await supabase.from("knowledge_sources").update({ status: "ready", error_message: null }).eq("id", source.id);

    return jsonResponse({ chunkCount: chunks.length });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error(err);
    return jsonResponse({ error: "No se pudo procesar el contenido. Intenta de nuevo." }, 500);
  }
});
