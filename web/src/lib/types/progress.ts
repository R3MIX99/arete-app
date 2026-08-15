export const MEASUREMENT_FIELDS = [
  { key: "weight_kg", label: "Peso", unit: "kg" },
  { key: "chest_cm", label: "Pecho", unit: "cm" },
  { key: "waist_cm", label: "Cintura", unit: "cm" },
  { key: "hip_cm", label: "Cadera", unit: "cm" },
  { key: "arm_cm", label: "Brazo", unit: "cm" },
  { key: "thigh_cm", label: "Muslo", unit: "cm" },
  { key: "neck_cm", label: "Cuello", unit: "cm" },
  { key: "shoulder_cm", label: "Hombros", unit: "cm" },
  { key: "calf_cm", label: "Pantorrilla", unit: "cm" },
  { key: "forearm_cm", label: "Antebrazo", unit: "cm" },
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
  muscle_group: string;
  starting_weight: number;
  current_weight: number;
  logs: ExerciseWeightLog[];
}
