/** Llama a la API de Mensajes de Anthropic y devuelve el texto de la
 * respuesta. La API key vive solo en el secreto de la Edge Function
 * (ANTHROPIC_API_KEY) — nunca se expone al cliente. */
export async function callClaude(params: {
  apiKey: string;
  system: string;
  userMessage: string;
  maxTokens?: number;
}): Promise<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": params.apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-5",
      max_tokens: params.maxTokens ?? 4096,
      system: params.system,
      messages: [{ role: "user", content: params.userMessage }],
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Anthropic API respondió ${res.status}: ${text.slice(0, 500)}`);
  }

  const data = await res.json();
  const block = Array.isArray(data.content)
    ? data.content.find((b: { type: string }) => b.type === "text")
    : null;
  const text = block?.text ?? "";
  if (!text) throw new Error("La IA no devolvió texto en la respuesta.");
  return text;
}

/** La IA a veces envuelve el JSON en texto o en un bloque ```json — esto
 * extrae el primer objeto/arreglo JSON balanceado que encuentra. */
export function extractJson<T>(text: string): T {
  const start = text.search(/[{[]/);
  if (start === -1) throw new Error("No se encontró JSON en la respuesta de la IA.");
  const openChar = text[start];
  const closeChar = openChar === "{" ? "}" : "]";
  let depth = 0;
  for (let i = start; i < text.length; i++) {
    if (text[i] === openChar) depth++;
    else if (text[i] === closeChar) {
      depth--;
      if (depth === 0) {
        const jsonText = text.slice(start, i + 1);
        return JSON.parse(jsonText) as T;
      }
    }
  }
  throw new Error("El JSON de la respuesta de la IA no está balanceado.");
}
