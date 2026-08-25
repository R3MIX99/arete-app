import { corsHeaders } from "./_shared/cors.ts";
import { callClaude, extractJson } from "./_shared/anthropic.ts";
import { requireTrainerWithinLimit, logAiUsage, jsonResponse } from "./_shared/trainer.ts";
import { fetchKnowledgeContext, knowledgeContextBlock } from "./_shared/knowledge.ts";

interface ScoreRoutineExercise {
  exercise_name: string;
  muscle_group: string;
  equipment: string;
  is_cardio: boolean;
  sets_count: number;
  target_reps_min?: number | null;
  target_reps_max?: number | null;
  target_minutes?: number | null;
}

interface ScoreRoutineRequest {
  routineId: string;
  name: string;
  level: string;
  goal: string | null;
  exercises: ScoreRoutineExercise[];
}

interface AiScoreResult {
  score: number;
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
    const { supabase, trainerId } = await requireTrainerWithinLimit(req, "score_routine");
    const body = (await req.json()) as ScoreRoutineRequest;

    if (!body.routineId || !body.exercises || body.exercises.length === 0) {
      return jsonResponse({ error: "La rutina necesita al menos un ejercicio para poder evaluarla." }, 400);
    }

    // El puntaje se guarda sobre una rutina que ya es del entrenador que
    // llama — la policy routines_update_own de por sí bloquea esto si no
    // le pertenece, pero se valida antes para dar un mensaje claro.
    const { data: routine } = await supabase
      .from("routines")
      .select("id, trainer_id")
      .eq("id", body.routineId)
      .maybeSingle();
    if (!routine || routine.trainer_id !== trainerId) {
      return jsonResponse({ error: "Esa rutina no te pertenece." }, 403);
    }

    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) return jsonResponse({ error: "La IA no está configurada todavía (falta ANTHROPIC_API_KEY)." }, 500);

    const exercisesText = body.exercises
      .map((e, i) => {
        const detail = e.is_cardio
          ? `${e.sets_count} series de ~${e.target_minutes ?? "?"} min`
          : `${e.sets_count} series de ${e.target_reps_min ?? "?"}-${e.target_reps_max ?? "?"} reps`;
        return `${i + 1}. ${e.exercise_name} — grupo:${e.muscle_group}, equipo:${e.equipment} — ${detail}`;
      })
      .join("\n");

    const system = `Eres un entrenador experto revisando la rutina de otro entrenador. Respondes ÚNICAMENTE con un objeto JSON válido, sin texto antes ni después, sin bloques de código markdown, con esta forma exacta:
{
  "score": number (entero de 0 a 100),
  "reasoning": string (3-5 frases en español, tono constructivo y directo, explicando el puntaje: qué está bien y qué se podría mejorar en cuanto a balance muscular entre grupos, volumen/progresión de series y repeticiones, y qué tan coherente es con el nivel y el objetivo declarados)
}
Evalúa considerando: (1) balance muscular — que no se sobrecargue un solo grupo dejando otros sin trabajar, (2) volumen y estructura de series/repeticiones razonable para el nivel, (3) qué tan coherente es la selección de ejercicios con el objetivo declarado del cliente. Sé justo pero exigente: una rutina genérica de 3 ejercicios sin balance no debería pasar de 60; una rutina bien pensada y completa puede llegar a 90+.`;

    // Fase 14: rutinas/documentos de referencia parecidos, para que la
    // evaluación considere estándares que el superadmin haya cargado.
    const knowledgeContext = await fetchKnowledgeContext({
      supabase,
      queryText: `Evaluar rutina de gimnasio para objetivo ${body.goal ? (GOAL_LABEL[body.goal] ?? body.goal) : "sin especificar"}, nivel ${LEVEL_LABEL[body.level] ?? body.level}`,
      category: body.goal,
    });

    const userMessage = `Nombre de la rutina: ${body.name}
Nivel: ${LEVEL_LABEL[body.level] ?? body.level}
Objetivo declarado: ${body.goal ? (GOAL_LABEL[body.goal] ?? body.goal) : "sin especificar"}

Ejercicios:
${exercisesText}
${knowledgeContextBlock(knowledgeContext)}`;

    const text = await callClaude({ apiKey, system, userMessage, maxTokens: 1024 });
    const result = extractJson<AiScoreResult>(text);
    const score = Math.max(0, Math.min(100, Math.round(result.score)));

    const { error: updateError } = await supabase
      .from("routines")
      .update({
        ai_score: score,
        ai_score_summary: result.reasoning,
        ai_analyzed_at: new Date().toISOString(),
      })
      .eq("id", body.routineId);
    if (updateError) {
      console.error(updateError);
      return jsonResponse({ error: "Se calculó el puntaje pero no se pudo guardar." }, 500);
    }

    await logAiUsage(supabase, trainerId, "score_routine");
    return jsonResponse({ score, reasoning: result.reasoning });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error(err);
    return jsonResponse({ error: "No se pudo calcular el puntaje. Intenta de nuevo." }, 500);
  }
});
