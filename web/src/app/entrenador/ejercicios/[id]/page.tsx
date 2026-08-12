import { notFound } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { ExerciseForm } from "@/components/trainer/exercise-form";
import type { ExerciseDetail } from "@/lib/types/exercise";

export default async function ExerciseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: exercise } = await supabase
    .from("exercises")
    .select("id, name, muscle_group, equipment, description, video_url")
    .eq("id", id)
    .single();

  if (!exercise) notFound();

  return <ExerciseForm mode="edit" exercise={exercise as ExerciseDetail} />;
}
