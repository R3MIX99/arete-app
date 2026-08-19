export interface SessionSetInfo {
  id: string; // routine_exercise_set_id
  set_number: number;
  target_reps_min: number | null;
  target_reps_max: number | null;
  suggested_weight: number | null;
  rest_seconds: number | null;
  target_minutes: number | null;
  target_level: number | null;
}

export interface SessionExerciseInfo {
  id: string; // routine_exercise_id
  exercise_id: string;
  exercise_name: string;
  exercise_description: string | null;
  muscle_group: string;
  equipment: string;
  video_url: string | null;
  /** URL pública de la foto del ejercicio (bucket exercise-images), ya
   * resuelta en el servidor. Si no tiene foto, la miniatura de su
   * video. Null si no tiene ninguna de las dos. */
  image_url: string | null;
  /** Segunda URL por si `image_url` es una miniatura de YouTube que no
   * existe para ese video. Null cuando es una foto subida. */
  image_fallback_url: string | null;
  notes: string | null;
  order_index: number;
  sets: SessionSetInfo[];
}

export interface SessionSetLog {
  routine_exercise_set_id: string;
  actual_reps: number | null;
  actual_weight: number | null;
  actual_minutes: number | null;
  actual_level: number | null;
  is_completed: boolean;
}

export interface CompletedSessionRow {
  id: string;
  sessionDate: string;
  routineName: string;
  durationSeconds: number | null;
  /** Series marcadas como completadas en esta sesión — insight rápido
   * en la lista de Historial, sin tener que abrir el detalle. */
  completedSets: number;
}

export interface ClientExerciseProgress {
  exerciseId: string;
  exerciseName: string;
  muscleGroup: string;
  logs: { date: string; weight: number; reps: number | null }[];
  /** Peso y reps de la serie más reciente — para el chip de "ahora
   * mismo estás en" en la lista de Evolución, sin tener que entrar al
   * detalle. null si el ejercicio no tiene ninguna serie con peso
   * registrada (p. ej. si solo se hizo con series de cardio). */
  currentWeight: number | null;
  currentReps: number | null;
}

/** Reseña que el cliente deja al terminar una sesión — campos de cardio
 * (calorías/distancia/pasos) o de fuerza (estrellas) según corresponda,
 * más dificultad y comentario libre, comunes a ambas. */
export interface SessionFeedback {
  difficultyLevel: number | null;
  ratingStars: number | null;
  caloriesBurned: number | null;
  distanceKm: number | null;
  stepsCount: number | null;
  clientComment: string | null;
}
