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
  muscle_group: string;
  equipment: string;
  video_url: string | null;
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
}

export interface ClientExerciseProgress {
  exerciseId: string;
  exerciseName: string;
  muscleGroup: string;
  logs: { date: string; weight: number }[];
}
