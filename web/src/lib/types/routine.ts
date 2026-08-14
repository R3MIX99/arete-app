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

export interface ExerciseOption {
  id: string;
  name: string;
  muscle_group: string;
  equipment: string;
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
}
