export type RoutineLevel = "beginner" | "intermediate" | "advanced";
export type RoutineGoal = "lose_weight" | "gain_muscle" | "maintenance" | "performance";

export interface RoutineSummary {
  id: string;
  name: string;
  description: string | null;
  level: RoutineLevel;
  goal: RoutineGoal | null;
  created_at: string;
  routine_exercises: { count: number }[];
}

/** Un comentario que un cliente dejó al terminar una sesión de esta
 * rutina, con el resto de su reseña para dar contexto. */
export interface RoutineSessionComment {
  clientName: string;
  sessionDate: string;
  comment: string;
  difficultyLevel: number | null;
  ratingStars: number | null;
  caloriesBurned: number | null;
  distanceKm: number | null;
  stepsCount: number | null;
}

export interface RoutineSummaryWithFeedback extends RoutineSummary {
  avgRating: number | null;
  ratingCount: number;
  comments: RoutineSessionComment[];
}

export interface ExerciseOption {
  id: string;
  name: string;
  muscle_group: string;
  equipment: string;
  video_url: string | null;
}

export interface RoutineSetInput {
  id?: string;
  set_number: number;
  // Series de fuerza: reps + descanso. Nulos en series de cardio.
  target_reps_min: number | null;
  target_reps_max: number | null;
  rest_seconds: number | null;
  // Series de cardio: minutos + nivel de intensidad (1-10). Nulos en
  // series de fuerza.
  target_minutes: number | null;
  target_level: number | null;
}

export interface RoutineExerciseInput {
  id?: string;
  exercise_id: string;
  exercise_name: string;
  // Grupo muscular del ejercicio — determina si sus series se capturan
  // como reps/descanso (fuerza) o minutos/nivel (cardio).
  exercise_muscle_group: string;
  exercise_video_url: string | null;
  order_index: number;
  notes: string;
  sets: RoutineSetInput[];
}

export interface RoutineDetail {
  id: string;
  name: string;
  description: string | null;
  level: RoutineLevel;
  goal: RoutineGoal | null;
  ai_score: number | null;
  ai_score_summary: string | null;
  ai_analyzed_at: string | null;
}
