import { createClient } from "@/lib/supabase/server";
import { ExercisesBrowser } from "@/components/trainer/exercises-browser";
import type { ExerciseSummary } from "@/lib/types/exercise";

export default async function ExercisesPage() {
  const supabase = await createClient();

  const { data: exercises } = await supabase
    .from("exercises")
    .select("id, name, muscle_group, equipment, video_url")
    .order("name");

  return <ExercisesBrowser exercises={(exercises ?? []) as ExerciseSummary[]} />;
}
