export type MuscleGroup =
  | "chest"
  | "back"
  | "shoulders"
  | "arms"
  | "legs"
  | "core"
  | "cardio"
  | "full_body"
  | "gluteos"
  | "gluteo_medio"
  | "femorales"
  | "cuadriceps"
  | "pantorrillas"
  | "aductores"
  | "abdomen"
  | "oblicuos"
  | "pecho_superior"
  | "pecho_inferior"
  | "dorsales"
  | "trapecio"
  | "deltoide_anterior"
  | "deltoide_lateral"
  | "deltoide_posterior"
  | "biceps"
  | "triceps"
  | "braquial"
  | "tibial_anterior"
  | "agarre";

export type Equipment =
  | "bodyweight"
  | "barbell"
  | "dumbbell"
  | "machine"
  | "cable"
  | "kettlebell"
  | "resistance_band"
  | "bench"
  | "other"
  | "pull_up_bar"
  | "cardio_machine"
  | "disc"
  | "landmine"
  | "fitball"
  | "ab_wheel"
  | "smith_machine";

export interface ExerciseSummary {
  id: string;
  name: string;
  muscle_groups: MuscleGroup[];
  equipment_items: Equipment[];
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
  muscle_groups: MuscleGroup[];
  equipment_items: Equipment[];
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
  muscle_groups: MuscleGroup[];
  equipment_items: Equipment[];
  description: string | null;
  video_url: string | null;
  image_path: string | null;
  trainer_id: string | null;
  forked_from: string | null;
  creator_name: string;
  in_my_library: boolean;
  created_at: string;
}
