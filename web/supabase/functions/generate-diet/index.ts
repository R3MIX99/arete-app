import { corsHeaders } from "./_shared/cors.ts";
import { callClaude, extractJson } from "./_shared/anthropic.ts";
import { requireTrainerWithinLimit, logAiUsage, jsonResponse } from "./_shared/trainer.ts";

interface CatalogDish {
  id: string;
  name: string;
  meal_type: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface CatalogFood {
  id: string;
  name: string;
  category: string;
  calories_per_100g: number;
  protein_per_100g: number;
  carbs_per_100g: number;
  fat_per_100g: number;
}

interface GenerateDietRequest {
  calorieTarget: number | null;
  preferences?: string;
  restrictions?: string;
  dishes: CatalogDish[];
  foods: CatalogFood[];
}

interface AiDietItem {
  type: "dish" | "food";
  id: string;
  name: string;
  quantity_grams?: number | null;
}

interface AiDietBlock {
  name: string;
  items: AiDietItem[];
}

interface AiDietResult {
  name: string;
  description: string;
  blocks: AiDietBlock[];
  reasoning: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { supabase, trainerId } = await requireTrainerWithinLimit(req, "generate_diet");
    const body = (await req.json()) as GenerateDietRequest;

    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) return jsonResponse({ error: "La IA no está configurada todavía (falta ANTHROPIC_API_KEY)." }, 500);

    const dishes = body.dishes.slice(0, 300);
    const foods = body.foods.slice(0, 300);

    const dishesText = dishes
      .map(
        (d) =>
          `- id:${d.id} | ${d.name} | tipo:${d.meal_type} | ${d.calories} kcal, ${d.protein}g prot, ${d.carbs}g carb, ${d.fat}g grasa (por porción)`,
      )
      .join("\n");
    const foodsText = foods
      .map(
        (f) =>
          `- id:${f.id} | ${f.name} | categoría:${f.category} | por 100g: ${f.calories_per_100g} kcal, ${f.protein_per_100g}g prot, ${f.carbs_per_100g}g carb, ${f.fat_per_100g}g grasa`,
      )
      .join("\n");

    const system = `Eres un nutriólogo que arma planes de alimentación como plantillas reutilizables para que un entrenador se las asigne a varios clientes. Respondes ÚNICAMENTE con un objeto JSON válido, sin texto antes ni después, sin bloques de código markdown. El JSON debe tener exactamente esta forma:
{
  "name": string (nombre corto del plan, en español),
  "description": string (1-2 frases),
  "blocks": [
    {
      "name": string (ej. "Desayuno", "Almuerzo", "Cena", "Snack", o el nombre que tenga sentido),
      "items": [
        { "type": "dish", "id": string, "name": string }
        // o, para un alimento individual con cantidad:
        { "type": "food", "id": string, "name": string, "quantity_grams": number }
      ]
    }
  ],
  "reasoning": string (2-4 frases explicando el criterio: por qué esas combinaciones cubren el objetivo calórico y las preferencias)
}

Reglas importantes:
- SOLO puedes usar platillos y alimentos que existan en los catálogos que te doy abajo, usando exactamente su "id". No inventes platillos ni alimentos nuevos, ni ids que no estén en las listas.
- Prefiere usar un "dish" (platillo ya armado) siempre que exista uno adecuado para ese bloque. Usa un "food" individual con su "quantity_grams" solo cuando no haya ningún platillo que encaje bien.
- Arma entre 3 y 5 bloques (comidas) que en conjunto se acerquen razonablemente a la meta calórica diaria, si te la dan.
- Respeta las restricciones (alergias, cosas que no puede comer) de forma estricta: si un platillo o alimento del catálogo choca con una restricción, no lo uses.
- Ten en cuenta las preferencias del cliente cuando elijas entre varias opciones válidas.`;

    const userMessage = `Meta calórica diaria: ${body.calorieTarget ? `${body.calorieTarget} kcal` : "sin especificar"}
Preferencias del cliente: ${body.preferences?.trim() || "sin preferencias particulares"}
Restricciones / alergias: ${body.restrictions?.trim() || "ninguna"}

Catálogo de platillos disponibles:
${dishesText || "(no hay platillos en el catálogo)"}

Catálogo de alimentos individuales disponibles:
${foodsText || "(no hay alimentos en el catálogo)"}`;

    const text = await callClaude({ apiKey, system, userMessage, maxTokens: 4096 });
    const result = extractJson<AiDietResult>(text);

    await logAiUsage(supabase, trainerId, "generate_diet");
    return jsonResponse(result);
  } catch (err) {
    if (err instanceof Response) return err;
    console.error(err);
    return jsonResponse({ error: "No se pudo generar el plan. Intenta de nuevo." }, 500);
  }
});
