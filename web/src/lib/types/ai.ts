import type { Equipment, MuscleGroup } from "@/lib/types/exercise";
import type { RoutineGoal, RoutineLevel } from "@/lib/types/routine";

export interface GenerateRoutineInput {
  goal: RoutineGoal;
  level: RoutineLevel;
  daysPerWeek: number;
  equipment: Equipment[];
  focus?: string;
}

export interface AiRoutineSet {
  set_number: number;
  target_reps_min?: number | null;
  target_reps_max?: number | null;
  rest_seconds?: number | null;
  target_minutes?: number | null;
  target_level?: number | null;
}

export interface AiRoutineExercise {
  exercise_id: string | null;
  exercise_name: string;
  muscle_group: MuscleGroup;
  is_cardio: boolean;
  notes: string;
  sets: AiRoutineSet[];
}

export interface AiRoutineResult {
  name: string;
  description: string;
  exercises: AiRoutineExercise[];
  reasoning: string;
}

export interface GenerateDietInput {
  calorieTarget: number | null;
  preferences: string;
  restrictions: string;
}

export interface AiDietItem {
  type: "dish" | "food";
  id: string;
  name: string;
  quantity_grams?: number | null;
}

export interface AiDietBlock {
  name: string;
  items: AiDietItem[];
}

export interface AiDietResult {
  name: string;
  description: string;
  blocks: AiDietBlock[];
  reasoning: string;
}

export interface AiScoreResult {
  score: number;
  reasoning: string;
}
