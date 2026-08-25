import type { SupabaseClient } from "jsr:@supabase/supabase-js@2";
import { embedOne } from "./voyage.ts";

/** Busca en knowledge_base (Fase 14) el contenido experto más parecido
 * a `queryText` y lo devuelve ya formateado para pegarlo en el prompt.
 * "" si no hay VOYAGE_API_KEY configurada, si falla la búsqueda, o si
 * no hay nada relevante — nunca debe tumbar la generación de la rutina
 * o la dieta por un problema de esta parte, que es un extra. */
export async function fetchKnowledgeContext(params: {
  supabase: SupabaseClient;
  queryText: string;
  category: string | null;
}): Promise<string> {
  const apiKey = Deno.env.get("VOYAGE_API_KEY");
  if (!apiKey) return "";

  try {
    const embedding = await embedOne({ apiKey, text: params.queryText, inputType: "query" });
    const { data, error } = await params.supabase.rpc("match_knowledge_chunks", {
      query_embedding: embedding,
      match_category: params.category,
      match_count: 4,
    });
    if (error || !data || data.length === 0) return "";

    return (data as Array<{ title: string; content: string; similarity: number }>)
      // Un fragmento poco parecido aporta más ruido que ayuda.
      .filter((row) => row.similarity > 0.5)
      .map((row) => `[Fuente: ${row.title}]\n${row.content}`)
      .join("\n\n---\n\n");
  } catch (err) {
    console.error("fetchKnowledgeContext falló, se sigue sin contexto extra:", err);
    return "";
  }
}

/** Bloque listo para insertar en el prompt — "" si no hay contexto, así
 * el llamador puede usarlo directo con un template string sin ifs. */
export function knowledgeContextBlock(context: string): string {
  if (!context) return "";
  return `\n\nConocimiento experto de referencia (úsalo como guía si aplica; no lo copies literal, y si no aplica al caso ignóralo):\n${context}\n`;
}
