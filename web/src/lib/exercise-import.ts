import { youtubeVideoId } from "@/lib/youtube";
import { muscleGroupLabels, equipmentLabels } from "@/lib/format";

function stripAccents(value: string): string {
  return value.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

function normalizeToken(value: string): string {
  return stripAccents(value)
    .toLowerCase()
    .replace(/[°º]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Sinónimos en español (con/sin acentos, singular/plural, variantes
 * comunes) → valor canónico del enum `exercise_muscle_group`. Cubre los
 * grupos que trae de fábrica el sistema y los que aparecen típicamente en
 * bibliotecas de ejercicios externas. */
const MUSCLE_GROUP_SYNONYMS: Record<string, string> = {
  pecho: "chest",
  pectorales: "chest",
  "pecho superior": "pecho_superior",
  "pecho inferior": "pecho_inferior",
  espalda: "back",
  dorsales: "dorsales",
  dorsal: "dorsales",
  hombro: "shoulders",
  hombros: "shoulders",
  "deltoide anterior": "deltoide_anterior",
  "deltoide lateral": "deltoide_lateral",
  "deltoide posterior": "deltoide_posterior",
  brazos: "arms",
  brazo: "arms",
  biceps: "biceps",
  triceps: "triceps",
  braquial: "braquial",
  antebrazo: "agarre",
  antebrazos: "agarre",
  agarre: "agarre",
  piernas: "legs",
  pierna: "legs",
  gluteos: "gluteos",
  gluteo: "gluteos",
  "gluteo medio": "gluteo_medio",
  femorales: "femorales",
  femoral: "femorales",
  isquiotibiales: "femorales",
  cuadriceps: "cuadriceps",
  aductores: "aductores",
  aductor: "aductores",
  pantorrillas: "pantorrillas",
  pantorrilla: "pantorrillas",
  gemelos: "pantorrillas",
  "tibial anterior": "tibial_anterior",
  core: "core",
  abdomen: "abdomen",
  abdominales: "abdomen",
  abs: "abdomen",
  oblicuos: "oblicuos",
  trapecio: "trapecio",
  trapecios: "trapecio",
  cardio: "cardio",
  cardiovascular: "cardio",
  acondicionamiento: "cardio",
  "cuerpo completo": "full_body",
  "full body": "full_body",
  "cuerpo entero": "full_body",
};

const EQUIPMENT_SYNONYMS: Record<string, string> = {
  "peso corporal": "bodyweight",
  "sin equipo": "bodyweight",
  barra: "barbell",
  "barra ez": "barbell",
  "barra v": "barbell",
  mancuerna: "dumbbell",
  mancuernas: "dumbbell",
  maquina: "machine",
  "hack squat": "machine",
  prensa: "machine",
  "t-bar": "machine",
  "t-bar/maquina": "machine",
  kettlebell: "kettlebell",
  banda: "resistance_band",
  "banda elastica": "resistance_band",
  banco: "bench",
  "banco 45": "bench",
  otro: "other",
  apoyo: "other",
  plataforma: "other",
  cuerda: "other",
  "barra de dominadas": "pull_up_bar",
  bicicleta: "cardio_machine",
  "bicicleta de aire": "cardio_machine",
  caminadora: "cardio_machine",
  eliptica: "cardio_machine",
  escaladora: "cardio_machine",
  "remo ergometro": "cardio_machine",
  disco: "disc",
  landmine: "landmine",
  fitball: "fitball",
  "rueda abdominal": "ab_wheel",
  multipower: "smith_machine",
  "smith machine": "smith_machine",
};

// También se aceptan directamente los valores canónicos (en inglés, tal
// cual los usa el sistema) por si el Excel ya los trae así.
for (const value of Object.keys(muscleGroupLabels)) MUSCLE_GROUP_SYNONYMS[value] ??= value;
for (const value of Object.keys(equipmentLabels)) EQUIPMENT_SYNONYMS[value] ??= value;

/** Separa "Glúteos + femorales", "Máquina/banco", "Piernas, core" en
 * tokens individuales, ignorando vacíos. */
function splitTokens(raw: string): string[] {
  return raw
    .split(/[+/,;]/)
    .map((t) => t.trim())
    .filter(Boolean);
}

export interface ParsedField {
  values: string[];
  unmapped: string[];
}

function resolveField(raw: string, dictionary: Record<string, string>): ParsedField {
  const tokens = splitTokens(raw);
  const values: string[] = [];
  const unmapped: string[] = [];
  for (const token of tokens) {
    const normalized = normalizeToken(token);
    const mapped = dictionary[normalized];
    if (mapped) {
      if (!values.includes(mapped)) values.push(mapped);
    } else if (token) {
      unmapped.push(token);
    }
  }
  return { values, unmapped };
}

export interface ParsedExerciseRow {
  rowNumber: number;
  name: string;
  muscleGroups: ParsedField;
  equipmentItems: ParsedField;
  description: string | null;
  videoUrl: string | null;
  /** true si el nombre viene vacío — fila inválida, nunca se importa. */
  missingName: boolean;
}

const HEADER_ALIASES: Record<string, string[]> = {
  name: ["nombre", "name", "ejercicio"],
  muscleGroup: ["grupo muscular", "grupo", "muscle group", "musculo"],
  equipment: ["equipo", "equipment"],
  description: ["descripcion", "description"],
  videoUrl: ["enlace", "video", "url", "link"],
};

function findColumn(headerRow: string[], key: keyof typeof HEADER_ALIASES): number {
  const aliases = HEADER_ALIASES[key];
  return headerRow.findIndex((h) => aliases.includes(normalizeToken(h)));
}

/** Convierte las filas crudas de una hoja de Excel (arreglo de arreglos,
 * primera fila = encabezados) en ejercicios listos para revisar/importar.
 * Reconoce encabezados en español o inglés, en cualquier orden. */
export function parseExerciseRows(sheetRows: unknown[][]): ParsedExerciseRow[] {
  if (sheetRows.length === 0) return [];
  const headerRow = sheetRows[0].map((h) => String(h ?? ""));

  const nameCol = findColumn(headerRow, "name");
  const muscleCol = findColumn(headerRow, "muscleGroup");
  const equipmentCol = findColumn(headerRow, "equipment");
  const descriptionCol = findColumn(headerRow, "description");
  const videoCol = findColumn(headerRow, "videoUrl");

  const rows: ParsedExerciseRow[] = [];
  for (let i = 1; i < sheetRows.length; i++) {
    const row = sheetRows[i];
    if (!row || row.every((cell) => cell === null || cell === undefined || cell === "")) continue;

    const cell = (col: number) => (col >= 0 ? String(row[col] ?? "").trim() : "");
    const name = cell(nameCol);
    const rawVideo = cell(videoCol);

    rows.push({
      rowNumber: i + 1,
      name,
      muscleGroups: resolveField(cell(muscleCol), MUSCLE_GROUP_SYNONYMS),
      equipmentItems: resolveField(cell(equipmentCol), EQUIPMENT_SYNONYMS),
      description: cell(descriptionCol) || null,
      // Solo se guarda si de verdad es un enlace de YouTube — el resto
      // (p. ej. enlaces de búsqueda de YouTube) se descarta, porque la
      // base de datos exige que video_url sea un enlace de YouTube válido.
      videoUrl: rawVideo && youtubeVideoId(rawVideo) ? rawVideo : null,
      missingName: name === "",
    });
  }
  return rows;
}
