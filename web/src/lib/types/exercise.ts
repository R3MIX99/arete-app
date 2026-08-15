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
  trainer_id: string | null;
  forked_from: string | null;
}

/** Ejercicio visto desde la pestaña Comunidad — cualquiera creado por
 * cualquier entrenador, o esencial de Areté (trainer_id null). */
export interface CommunityExerciseOption {
  id: string;
  name: string;
  muscle_group: MuscleGroup;
  equipment: Equipment;
  description: string | null;
  video_url: string | null;
  trainer_id: string | null;
  forked_from: string | null;
  creator_name: string;
  in_my_library: boolean;
}
