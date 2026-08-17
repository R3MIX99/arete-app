import type { SupabaseClient } from "@supabase/supabase-js";

import { youtubeThumbnailUrl } from "@/lib/youtube";
import type { RoutineCardMeta } from "@/components/client/routine-session-card";

interface RoutineRow {
  id: string;
  image_path: string | null;
}

interface ExerciseJoin {
  image_path: string | null;
  video_url: string | null;
}

interface RoutineExerciseRow {
  routine_id: string;
  order_index: number;
  exercises: ExerciseJoin | ExerciseJoin[] | null;
  routine_exercise_sets: { id: string }[] | null;
}

function one<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : value;
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
export async function fetchRoutineCardMeta(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>,
): Promise<Record<string, RoutineCardMeta>> {
  const [{ data: routineRows }, { data: exerciseRows }] = await Promise.all([
    supabase.from("routines").select("id, image_path"),
    supabase
      .from("routine_exercises")
      .select("routine_id, order_index, exercises(image_path, video_url), routine_exercise_sets(id)")
      .order("order_index"),
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

  // Si la rutina no trae foto propia, hereda la de su primer ejercicio
  // (su foto, o si no la miniatura de su video). Se recorre en orden y
  // se toma la primera que exista: normalmente es la del ejercicio 1,
  // pero si ese no tiene ni foto ni video, seguir buscando da mejor
  // resultado que dejar la tarjeta con el ícono genérico.
  for (const row of (exerciseRows ?? []) as unknown as RoutineExerciseRow[]) {
    const entry = meta[row.routine_id];
    if (!entry) continue;
    entry.exerciseCount += 1;
    entry.setCount += row.routine_exercise_sets?.length ?? 0;

    if (!entry.imageUrl) {
      const exercise = one(row.exercises);
      entry.imageUrl = exercise?.image_path
        ? supabase.storage.from("exercise-images").getPublicUrl(exercise.image_path).data.publicUrl
        : youtubeThumbnailUrl(exercise?.video_url ?? null, "wide");
    }
  }

  return meta;
}
