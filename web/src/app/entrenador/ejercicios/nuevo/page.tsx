import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { ExerciseForm } from "@/components/trainer/exercise-form";

export default async function NewExercisePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return <ExerciseForm mode="create" trainerId={user.id} />;
}
