import type { SupabaseClient } from "@supabase/supabase-js";

import { youtubeThumbnailUrl } from "@/lib/youtube";
import type { SessionExerciseInfo } from "@/lib/types/client-panel";

interface ExerciseJoin {
  name: string;
  description: string | null;
  muscle_group: string;
  equipment: string;
  video_url: string | null;
  image_path: string | null;
}

interface RoutineExerciseRow {
  id: string;
  exercise_id: string;
  order_index: number;
  notes: string | null;
  exercises: ExerciseJoin | ExerciseJoin[] | null;
  routine_exercise_sets: {
    id: string;
    set_number: number;
    target_reps_min: number | null;
    target_reps_max: number | null;
    suggested_weight: number | null;
    rest_seconds: number | null;
    target_minutes: number | null;
    target_level: number | null;
  }[];
}

function one<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

/** Rutina + lista de ejercicios (con sus series objetivo) que usan
 * tanto la vista previa como la sesión activa de entrenamiento — mismo
 * shape, mismo orden. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function fetchRoutineSessionData(supabase: SupabaseClient<any>, routineId: string) {
  const [{ data: routineRow }, { data: exerciseRows }] = await Promise.all([
    supabase.from("routines").select("id, name, description, level, goal").eq("id", routineId).single(),
    supabase
      .from("routine_exercises")
      .select(
        "id, exercise_id, order_index, notes, exercises(name, description, muscle_group, equipment, video_url, image_path), routine_exercise_sets(id, set_number, target_reps_min, target_reps_max, suggested_weight, rest_seconds, target_minutes, target_level)",
      )
      .eq("routine_id", routineId)
      .order("order_index"),
  ]);

  if (!routineRow) return null;

  const exercises: SessionExerciseInfo[] = ((exerciseRows ?? []) as RoutineExerciseRow[]).map((row) => {
    const ex = one(row.exercises);
    return {
      id: row.id,
      exercise_id: row.exercise_id,
      exercise_name: ex?.name ?? "Ejercicio",
      exercise_description: ex?.description ?? null,
      muscle_group: ex?.muscle_group ?? "",
      equipment: ex?.equipment ?? "",
      video_url: ex?.video_url ?? null,
      // Sin foto propia se usa la miniatura del video: es mejor que un
      // ícono genérico, y casi todos los ejercicios traen video.
      image_url: ex?.image_path
        ? supabase.storage.from("exercise-images").getPublicUrl(ex.image_path).data.publicUrl
        : youtubeThumbnailUrl(ex?.video_url ?? null),
      notes: row.notes,
      order_index: row.order_index,
      sets: (row.routine_exercise_sets ?? [])
        .slice()
        .sort((a, b) => a.set_number - b.set_number)
        .map((s) => ({
          id: s.id,
          set_number: s.set_number,
          target_reps_min: s.target_reps_min,
          target_reps_max: s.target_reps_max,
          suggested_weight: s.suggested_weight,
          rest_seconds: s.rest_seconds,
          target_minutes: s.target_minutes,
          target_level: s.target_level,
        })),
    };
  });

  return {
    routineName: routineRow.name as string,
    routineDescription: (routineRow.description as string | null) ?? null,
    exercises,
  };
}
