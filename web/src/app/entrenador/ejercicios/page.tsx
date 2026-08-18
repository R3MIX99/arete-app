import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { ExercisesShell } from "@/components/trainer/exercises-shell";
import type { CommunityExerciseOption, ExerciseSummary } from "@/lib/types/exercise";

interface ExerciseRow {
  id: string;
  name: string;
  muscle_group: ExerciseSummary["muscle_group"];
  equipment: ExerciseSummary["equipment"];
  description: string | null;
  video_url: string | null;
  image_path: string | null;
  trainer_id: string | null;
  forked_from: string | null;
  created_at: string;
  profiles: { full_name: string } | { full_name: string }[] | null;
}

function one<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export default async function ExercisesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: exercises }, { data: hiddenRows }] = await Promise.all([
    supabase
      .from("exercises")
      .select(
        "id, name, muscle_group, equipment, description, video_url, image_path, trainer_id, forked_from, created_at, profiles!exercises_trainer_id_fkey(full_name)",
      )
      .order("name"),
    supabase.from("trainer_hidden_exercises").select("exercise_id").eq("trainer_id", user.id),
  ]);

  const allRows = (exercises ?? []) as ExerciseRow[];
  const hiddenIds = new Set((hiddenRows ?? []).map((r) => r.exercise_id as string));

  // Ejercicios ya copiados a mi biblioteca (por id de origen), para
  // marcar en Comunidad cuáles ya tengo agregados.
  const forkedIds = new Set(
    allRows.filter((r) => r.trainer_id === user.id && r.forked_from).map((r) => r.forked_from!),
  );

  const myExercises: ExerciseSummary[] = allRows
    .filter((r) => (!r.trainer_id && !hiddenIds.has(r.id)) || r.trainer_id === user.id)
    .map((r) => ({
      id: r.id,
      name: r.name,
      muscle_group: r.muscle_group,
      equipment: r.equipment,
      video_url: r.video_url,
      image_path: r.image_path,
      trainer_id: r.trainer_id,
      forked_from: r.forked_from,
    }));

  // La comunidad solo muestra ejercicios originales — una copia
  // personalizada (forked_from no nulo) es tuya, no algo nuevo que
  // aportaste a la comunidad, así que no aparece aquí ni para ti ni
  // para nadie más.
  const communityExercises: CommunityExerciseOption[] = allRows
    .filter((r) => !r.forked_from)
    .map((r) => ({
      id: r.id,
      name: r.name,
      muscle_group: r.muscle_group,
      equipment: r.equipment,
      description: r.description,
      video_url: r.video_url,
      image_path: r.image_path,
      trainer_id: r.trainer_id,
      forked_from: r.forked_from,
      creator_name: r.trainer_id ? (one(r.profiles)?.full_name ?? "Entrenador") : "Aretia",
      created_at: r.created_at,
      in_my_library:
        (!r.trainer_id && !hiddenIds.has(r.id)) || r.trainer_id === user.id || forkedIds.has(r.id),
    }));

  return (
    <ExercisesShell
      exercises={myExercises}
      communityExercises={communityExercises}
      trainerId={user.id}
    />
  );
}
