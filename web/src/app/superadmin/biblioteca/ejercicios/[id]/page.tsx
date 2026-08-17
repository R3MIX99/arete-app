import { notFound } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { LibraryExerciseForm } from "@/components/superadmin/library-exercise-form";
import type { ExerciseDetail } from "@/lib/types/exercise";

export default async function LibraryExerciseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: exercise } = await supabase
    .from("exercises")
    .select("id, name, muscle_group, equipment, description, video_url, image_path, trainer_id, forked_from")
    .eq("id", id)
    .is("trainer_id", null)
    .maybeSingle();

  if (!exercise) notFound();

  return <LibraryExerciseForm mode="edit" exercise={exercise as ExerciseDetail} />;
}
