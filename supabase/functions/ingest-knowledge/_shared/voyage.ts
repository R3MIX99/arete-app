/** Embeddings vía Voyage AI (voyage-3-lite, 512 dimensiones) — es el
 * proveedor de embeddings que recomienda Anthropic para usar junto con
 * Claude, ya que Anthropic no ofrece uno propio. La llave vive solo en
 * el secreto de la Edge Function (VOYAGE_API_KEY).
 *
 * "document" vs "query" no es cosmético: Voyage entrena el modelo
 * distinto según de qué lado del par está el texto (lo que se guardó
 * vs. lo que se busca), y usar el tipo correcto mejora la similitud de
 * verdad — no es solo un parámetro decorativo. */
export async function embedTexts(params: {
  apiKey: string;
  texts: string[];
  inputType: "query" | "document";
}): Promise<number[][]> {
  const res = await fetch("https://api.voyageai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${params.apiKey}`,
    },
    body: JSON.stringify({
      input: params.texts,
      model: "voyage-3-lite",
      input_type: params.inputType,
      output_dimension: 512,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Voyage AI respondió ${res.status}: ${text.slice(0, 500)}`);
  }

  const data = await res.json();
  return (data.data as Array<{ embedding: number[] }>).map((d) => d.embedding);
}

/** Un solo texto, para el caso común de embedear la búsqueda. */
export async function embedOne(params: {
  apiKey: string;
  text: string;
  inputType: "query" | "document";
}): Promise<number[]> {
  const [embedding] = await embedTexts({ ...params, texts: [params.text] });
  return embedding;
}
