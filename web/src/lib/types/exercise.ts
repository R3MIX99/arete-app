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
  image_path: string | null;
  /** null = esencial de Aretia; en mi biblioteca solo puede ser esto o mi
   * propio id de entrenador (ver ExercisesPage). */
  trainer_id: string | null;
  forked_from: string | null;
}

export interface ExerciseDetail {
  id: string;
  name: string;
  muscle_group: MuscleGroup;
  equipment: Equipment;
  description: string | null;
  video_url: string | null;
  image_path: string | null;
  trainer_id: string | null;
  forked_from: string | null;
}

/** Ejercicio visto desde la pestaña Comunidad — cualquiera creado por
 * cualquier entrenador, o esencial de Aretia (trainer_id null). */
export interface CommunityExerciseOption {
  id: string;
  name: string;
  muscle_group: MuscleGroup;
  equipment: Equipment;
  description: string | null;
  video_url: string | null;
  image_path: string | null;
  trainer_id: string | null;
  forked_from: string | null;
  creator_name: string;
  in_my_library: boolean;
  created_at: string;
}
