export type MuscleGroup =
  | "chest"
  | "back"
  | "shoulders"
  | "arms"
  | "legs"
  | "core"
  | "cardio"
  | "full_body";

export type Equipment =
  | "bodyweight"
  | "barbell"
  | "dumbbell"
  | "machine"
  | "cable"
  | "kettlebell"
  | "resistance_band"
  | "bench"
  | "other";

export interface ExerciseSummary {
  id: string;
  name: string;
  muscle_group: MuscleGroup;
  equipment: Equipment;
  video_url: string | null;
}

export interface ExerciseDetail {
  id: string;
  name: string;
  muscle_group: MuscleGroup;
  equipment: Equipment;
  description: string | null;
  video_url: string | null;
}
