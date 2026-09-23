export const MEASUREMENT_FIELDS = [
  { key: "weight_kg", label: "Peso", unit: "kg" },
  { key: "cephalic_cm", label: "Cefálico", unit: "cm" },
  { key: "neck_cm", label: "Cuello", unit: "cm" },
  // "Brazo" pasó a ser específicamente el relajado; el contraído es una
  // medida nueva (clave nueva, no un renombre).
  { key: "arm_cm", label: "Mitad del brazo relajado", unit: "cm" },
  { key: "bicep_flexed_cm", label: "Mitad del brazo contraído", unit: "cm" },
  { key: "forearm_cm", label: "Antebrazo", unit: "cm" },
  { key: "wrist_cm", label: "Muñeca", unit: "cm" },
  { key: "mesosternal_cm", label: "Mesoesternal", unit: "cm" },
  { key: "umbilical_cm", label: "Umbilical", unit: "cm" },
  { key: "waist_cm", label: "Cintura", unit: "cm" },
  { key: "hip_cm", label: "Cadera", unit: "cm" },
  { key: "thigh_1cm_cm", label: "Muslo (1cm)", unit: "cm" },
  // "Muslo" pasó a llamarse "Muslo medio" (mismo dato, mismo historial).
  { key: "thigh_cm", label: "Muslo medio", unit: "cm" },
  { key: "calf_cm", label: "Pantorrilla", unit: "cm" },
  { key: "ankle_cm", label: "Tobillo", unit: "cm" },
  { key: "chest_cm", label: "Pecho", unit: "cm" },
  { key: "shoulder_cm", label: "Hombros", unit: "cm" },
] as const;

export type MeasurementKey = (typeof MEASUREMENT_FIELDS)[number]["key"];

/**
 * Una medida individual (peso, pecho, cintura, etc.) en una fecha —
 * cada una vive en su propia fila (tabla `progress_measurements`), así
 * que editar o eliminar una no afecta a las demás medidas del mismo día.
 */
export interface ProgressMeasurement {
  id: string;
  entry_date: string;
  metric_key: MeasurementKey;
  value: number;
  notes: string | null;
}

export interface ProgressPhotoEntry {
  id: string;
  entry_date: string;
  photo_path: string | null;
  notes: string | null;
}

export interface ExerciseWeightLog {
  date: string;
  weight: number;
}

export interface ExerciseProgressSummary {
  exercise_id: string;
  exercise_name: string;
  muscle_groups: string[];
  /** En cardio no existe el peso: aquí van los minutos. La unidad real
   * la dice `unit`, para que la tabla muestre "30 min" y no "30 kg". */
  starting_weight: number;
  current_weight: number;
  unit: "kg" | "min";
  logs: ExerciseWeightLog[];
}
