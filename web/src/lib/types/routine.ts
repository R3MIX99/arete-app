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
  target_reps_min: number;
  target_reps_max: number;
  suggested_weight: number | null;
  rest_seconds: number;
}

export interface RoutineExerciseInput {
  id?: string;
  exercise_id: string;
  exercise_name: string;
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
