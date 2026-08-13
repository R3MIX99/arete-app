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

export interface ProgressEntry {
  id: string;
  entry_date: string;
  weight_kg: number | null;
  chest_cm: number | null;
  waist_cm: number | null;
  hip_cm: number | null;
  arm_cm: number | null;
  thigh_cm: number | null;
  neck_cm: number | null;
  shoulder_cm: number | null;
  calf_cm: number | null;
  forearm_cm: number | null;
  notes: string | null;
  photo_path?: string | null;
}

export interface ExerciseWeightLog {
  date: string;
  weight: number;
}

export interface ExerciseProgressSummary {
  exercise_id: string;
  exercise_name: string;
  starting_weight: number;
  current_weight: number;
  logs: ExerciseWeightLog[];
}
