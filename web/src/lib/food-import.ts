function normalizeToken(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/** Categorías del Excel (con o sin acentos, singular/plural) → slug de
 * `food_categories`. Incluye sinónimos de las categorías que ya existen. */
const CATEGORY_SLUG_SYNONYMS: Record<string, string> = {
  proteina: "protein",
  proteinas: "protein",
  legumbre: "legume",
  legumbres: "legume",
  carbohidrato: "carbohydrate",
  carbohidratos: "carbohydrate",
  cereal: "carbohydrate",
  cereales: "carbohydrate",
  verdura: "vegetable",
  verduras: "vegetable",
  ensalada: "vegetable",
  "verdura o ensalada": "vegetable",
  fruta: "fruit",
  frutas: "fruit",
  grasa: "fat",
  grasas: "fat",
  lacteo: "dairy",
  lacteos: "dairy",
  bebida: "beverage",
  bebidas: "beverage",
  suplemento: "supplement",
  suplementos: "supplement",
  condimento: "condiment",
  condimentos: "condiment",
  especia: "condiment",
  especias: "condiment",
  salsa: "condiment",
  salsas: "condiment",
  otro: "other",
  otros: "other",
};

export interface FoodCategoryRef {
  id: string;
  slug: string;
  name: string;
}

export interface ParsedFoodRow {
  rowNumber: number;
  name: string;
  categoryLabel: string;
  categoryId: string | null;
  categorySlug: string | null;
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  householdUnitName: string | null;
  householdUnitGrams: number | null;
  /** Problemas que impiden importar la fila (nombre vacío, categoría o
   * macros inválidos). Con al menos uno, la fila no se puede seleccionar. */
  errors: string[];
  /** Avisos que no bloquean (p. ej. medida casera incompleta). */
  warnings: string[];
}

const HEADER_ALIASES = {
  name: ["nombre", "alimento", "name"],
  category: ["categoria", "category"],
  calories: ["calorias", "calorias (kcal)", "kcal", "calories"],
  protein: ["proteina (g)", "proteina", "proteinas", "protein"],
  carbs: ["carbohidratos (g)", "carbohidratos", "carbs", "carbohydrates"],
  fat: ["grasa (g)", "grasa", "grasas", "fat"],
  householdName: ["medida casera - nombre", "medida casera", "unidad", "medida"],
  householdGrams: ["equivale a (g)", "equivale a", "equivale (g)", "gramos por medida"],
} as const;

function findColumn(headerRow: string[], key: keyof typeof HEADER_ALIASES): number {
  const aliases: readonly string[] = HEADER_ALIASES[key];
  return headerRow.findIndex((h) => aliases.includes(normalizeToken(h)));
}

/** Acepta 26, "26", "26.5" y "26,5". Devuelve null si está vacío y NaN si
 * hay texto que no es un número. */
function parseNumber(raw: unknown): number | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : Number.NaN;
  const text = String(raw).trim().replace(",", ".");
  if (text === "") return null;
  const value = Number(text);
  return Number.isFinite(value) ? value : Number.NaN;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/** De todas las hojas del libro, la de alimentos: la que se llama
 * "Alimentos", o si no, la primera que tenga columnas de categoría y
 * calorías. */
export function pickFoodSheetName(
  sheetNames: string[],
  headersBySheet: Record<string, string[]>,
): string | null {
  const byName = sheetNames.find((n) => normalizeToken(n) === "alimentos");
  if (byName) return byName;
  return (
    sheetNames.find((n) => {
      const headers = headersBySheet[n] ?? [];
      return findColumn(headers, "category") >= 0 && findColumn(headers, "calories") >= 0;
    }) ?? null
  );
}

/** Convierte las filas crudas de la hoja (primera fila = encabezados) en
 * alimentos listos para revisar. Todos los valores nutrimentales son por
 * 100 g, igual que en el formulario de alimento. */
export function parseFoodRows(
  sheetRows: unknown[][],
  categories: FoodCategoryRef[],
): ParsedFoodRow[] {
  if (sheetRows.length === 0) return [];
  const headerRow = sheetRows[0].map((h) => String(h ?? ""));

  const cols = {
    name: findColumn(headerRow, "name"),
    category: findColumn(headerRow, "category"),
    calories: findColumn(headerRow, "calories"),
    protein: findColumn(headerRow, "protein"),
    carbs: findColumn(headerRow, "carbs"),
    fat: findColumn(headerRow, "fat"),
    householdName: findColumn(headerRow, "householdName"),
    householdGrams: findColumn(headerRow, "householdGrams"),
  };

  const bySlug = new Map(categories.map((c) => [c.slug, c]));
  const byName = new Map(categories.map((c) => [normalizeToken(c.name), c]));

  const rows: ParsedFoodRow[] = [];
  for (let i = 1; i < sheetRows.length; i++) {
    const row = sheetRows[i];
    if (!row || row.every((cell) => cell === null || cell === undefined || cell === "")) continue;

    const text = (col: number) => (col >= 0 ? String(row[col] ?? "").trim() : "");
    const num = (col: number) => (col >= 0 ? parseNumber(row[col]) : null);

    const errors: string[] = [];
    const warnings: string[] = [];

    const name = text(cols.name);
    if (!name) errors.push("Sin nombre");

    const categoryLabel = text(cols.category);
    const normalizedCategory = normalizeToken(categoryLabel);
    const category =
      byName.get(normalizedCategory) ??
      bySlug.get(CATEGORY_SLUG_SYNONYMS[normalizedCategory] ?? normalizedCategory) ??
      null;
    if (!category) {
      errors.push(
        categoryLabel ? `Categoría "${categoryLabel}" no reconocida` : "Sin categoría",
      );
    }

    const macros = {
      calories: num(cols.calories),
      protein: num(cols.protein),
      carbs: num(cols.carbs),
      fat: num(cols.fat),
    };
    const macroLabels: Record<keyof typeof macros, string> = {
      calories: "calorías",
      protein: "proteína",
      carbs: "carbohidratos",
      fat: "grasa",
    };
    for (const key of Object.keys(macros) as (keyof typeof macros)[]) {
      const value = macros[key];
      if (value === null) errors.push(`Falta ${macroLabels[key]}`);
      else if (Number.isNaN(value)) errors.push(`${macroLabels[key]} no es un número`);
      else if (value < 0) errors.push(`${macroLabels[key]} no puede ser negativa`);
    }

    let householdUnitName: string | null = text(cols.householdName) || null;
    let householdUnitGrams: number | null = num(cols.householdGrams);
    if (householdUnitGrams !== null && (Number.isNaN(householdUnitGrams) || householdUnitGrams <= 0)) {
      warnings.push("La equivalencia en gramos no es válida: se guardó sin medida casera");
      householdUnitGrams = null;
      householdUnitName = null;
    } else if ((householdUnitName === null) !== (householdUnitGrams === null)) {
      warnings.push("La medida casera está incompleta (falta nombre o gramos): se guardó sin ella");
      householdUnitGrams = null;
      householdUnitName = null;
    }

    const valid = (v: number | null) => (v !== null && !Number.isNaN(v) && v >= 0 ? round2(v) : null);
    rows.push({
      rowNumber: i + 1,
      name,
      categoryLabel,
      categoryId: category?.id ?? null,
      categorySlug: category?.slug ?? null,
      calories: valid(macros.calories),
      protein: valid(macros.protein),
      carbs: valid(macros.carbs),
      fat: valid(macros.fat),
      householdUnitName,
      householdUnitGrams: householdUnitGrams === null ? null : round2(householdUnitGrams),
      errors,
      warnings,
    });
  }
  return rows;
}

export function normalizeFoodName(name: string): string {
  return normalizeToken(name);
}
