import { corsHeaders } from "./_shared/cors.ts";
import { callClaude, extractJson } from "./_shared/anthropic.ts";
import { requireTrainerWithinLimit, logAiUsage, jsonResponse } from "./_shared/trainer.ts";

interface CatalogExercise {
  id: string;
  name: string;
  muscle_group: string;
  equipment: string;
}

interface GenerateRoutineRequest {
  goal: string;
  level: string;
  daysPerWeek: number;
  equipment: string[];
  focus?: string;
  catalog: CatalogExercise[];
}

interface AiRoutineSet {
  set_number: number;
  target_reps_min?: number | null;
  target_reps_max?: number | null;
  rest_seconds?: number | null;
  target_minutes?: number | null;
  target_level?: number | null;
}

interface AiRoutineExercise {
  exercise_id: string | null;
  exercise_name: string;
  muscle_group: string;
  is_cardio: boolean;
  notes: string;
  sets: AiRoutineSet[];
}

interface AiRoutineResult {
  name: string;
  description: string;
  exercises: AiRoutineExercise[];
  reasoning: string;
}

const GOAL_LABEL: Record<string, string> = {
  lose_weight: "perder peso",
  gain_muscle: "ganar músculo",
  maintenance: "mantenimiento",
  performance: "rendimiento deportivo",
};

const LEVEL_LABEL: Record<string, string> = {
  beginner: "principiante",
  intermediate: "intermedio",
  advanced: "avanzado",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { supabase, trainerId } = await requireTrainerWithinLimit(req, "generate_routine");
    const body = (await req.json()) as GenerateRoutineRequest;

    if (!body.goal || !body.level || !body.daysPerWeek) {
      return jsonResponse({ error: "Faltan datos: objetivo, nivel y días disponibles." }, 400);
    }

    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) return jsonResponse({ error: "La IA no está configurada todavía (falta ANTHROPIC_API_KEY)." }, 500);

    // Se limita el catálogo enviado para no exceder el contexto — no
    // hace falta mandar los 500 ejercicios si hay muchos, con una
    // muestra amplia le basta para encontrar coincidencias razonables.
    const catalog = body.catalog.slice(0, 400);
    const catalogText = catalog
      .map((e) => `- id:${e.id} | ${e.name} | grupo:${e.muscle_group} | equipo:${e.equipment}`)
      .join("\n");

    const system = `Eres un entrenador personal experto que arma rutinas de una sola sesión de gimnasio para un entrenador que las va a asignar a sus clientes. Respondes ÚNICAMENTE con un objeto JSON válido, sin texto antes ni después, sin bloques de código markdown. El JSON debe tener exactamente esta forma:
{
  "name": string (nombre corto y descriptivo de la rutina, en español),
  "description": string (1-2 frases),
  "exercises": [
    {
      "exercise_id": string o null,
      "exercise_name": string,
      "muscle_group": uno de "chest","back","shoulders","arms","legs","core","cardio","full_body",
      "is_cardio": boolean,
      "notes": string (puede ser ""),
      "sets": [
        // si is_cardio es false:
        { "set_number": number, "target_reps_min": number, "target_reps_max": number, "rest_seconds": number }
        // si is_cardio es true:
        { "set_number": number, "target_minutes": number, "target_level": number (1-10) }
      ]
    }
  ],
  "reasoning": string (2-4 frases explicando brevemente el criterio usado: balance de grupos musculares, volumen, progresión)
}

Reglas importantes:
- SIEMPRE que un ejercicio de la biblioteca del entrenador (la lista de "catálogo" que te doy) sea razonable para el plan, usa exactamente ese "id" en "exercise_id" y copia su nombre y grupo muscular tal cual aparecen en el catálogo.
- Solo si de verdad no hay ningún ejercicio adecuado en el catálogo para cubrir un grupo muscular necesario, sugiere uno nuevo con "exercise_id": null — pero priorizá siempre usar el catálogo antes que sugerir algo nuevo.
- Arma una única sesión de entrenamiento (no un plan de varios días) pensada para el número de días por semana solo como referencia de volumen total: entre 5 y 9 ejercicios, con 3-4 series cada uno salvo que el nivel o el enfoque pidan otra cosa.
- Respeta el equipo disponible que te indican si te lo dan.
- No repitas el mismo ejercicio dos veces.`;

    const userMessage = `Objetivo del cliente: ${GOAL_LABEL[body.goal] ?? body.goal}
Nivel: ${LEVEL_LABEL[body.level] ?? body.level}
Días de entrenamiento por semana: ${body.daysPerWeek}
Equipo disponible: ${body.equipment.length > 0 ? body.equipment.join(", ") : "cualquiera"}
${body.focus ? `Enfoque o pedido adicional del entrenador: ${body.focus}` : ""}

Catálogo de ejercicios disponibles (usa estos ids cuando aplique):
${catalogText || "(el entrenador todavía no tiene ejercicios en su biblioteca)"}`;

    const text = await callClaude({ apiKey, system, userMessage, maxTokens: 4096 });
    const result = extractJson<AiRoutineResult>(text);

    await logAiUsage(supabase, trainerId, "generate_routine");
    return jsonResponse(result);
  } catch (err) {
    if (err instanceof Response) return err;
    console.error(err);
    return jsonResponse({ error: "No se pudo generar la rutina. Intenta de nuevo." }, 500);
  }
});
