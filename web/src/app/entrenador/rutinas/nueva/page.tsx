import { createClient } from "@/lib/supabase/server";
import { RoutineForm } from "@/components/trainer/routine-form";
import type { ExerciseOption } from "@/lib/types/routine";

export default async function NewRoutinePage() {
  const supabase = await createClient();
  const { data: exercises } = await supabase
    .from("exercises")
    .select("id, name, muscle_group, equipment")
    .order("name");

  return (
    <RoutineForm mode="create" exerciseCatalog={(exercises ?? []) as ExerciseOption[]} />
  );
}
