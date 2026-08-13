import type { ClientGoal } from "@/lib/types/client";
import type { RoutineLevel } from "@/lib/types/routine";

export interface ProgramSummary {
  id: string;
  name: string;
  description: string | null;
  duration_weeks: number;
  goal: ClientGoal | null;
  created_at: string;
}

export interface RoutineOption {
  id: string;
  name: string;
  level: RoutineLevel;
}

export interface ProgramSlot {
  id: string;
  week_number: number;
  day_of_week: number;
  notes: string | null;
  routine_id: string;
  routine_name: string;
  routine_level: RoutineLevel;
}

export interface ProgramAssignment {
  id: string;
  client_id: string;
  client_name: string;
  start_date: string;
}

export interface SlotOverride {
  id: string;
  program_routine_id: string;
  routine_id: string;
  routine_name: string;
}
