import type { SupabaseClient } from "@supabase/supabase-js";

import type { RoutineCardMeta } from "@/components/client/routine-session-card";

interface RoutineRow {
  id: string;
  image_path: string | null;
}

interface RoutineExerciseRow {
  routine_id: string;
  routine_exercise_sets: { id: string }[] | null;
}

/**
 * Foto, número de ejercicios y número de series de cada rutina que el
 * cliente puede ver — lo que necesita la tarjeta de rutina y que el
 * cálculo del calendario no sabe (solo maneja id y nombre).
 *
 * Se traen todas las rutinas visibles de una vez en lugar de consultar
 * por sesión: RLS ya las acota a las del cliente (`client_can_see_routine`),
 * y así la agenda de un mes entero no dispara una consulta por día.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function fetchRoutineCardMeta(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>,
): Promise<Record<string, RoutineCardMeta>> {
  const [{ data: routineRows }, { data: exerciseRows }] = await Promise.all([
    supabase.from("routines").select("id, image_path"),
    supabase.from("routine_exercises").select("routine_id, routine_exercise_sets(id)"),
  ]);

  const meta: Record<string, RoutineCardMeta> = {};
  for (const row of (routineRows ?? []) as RoutineRow[]) {
    meta[row.id] = {
      imageUrl: row.image_path
        ? supabase.storage.from("routine-images").getPublicUrl(row.image_path).data.publicUrl
        : null,
      exerciseCount: 0,
      setCount: 0,
    };
  }

  for (const row of (exerciseRows ?? []) as unknown as RoutineExerciseRow[]) {
    const entry = meta[row.routine_id];
    if (!entry) continue;
    entry.exerciseCount += 1;
    entry.setCount += row.routine_exercise_sets?.length ?? 0;
  }

  return meta;
}
