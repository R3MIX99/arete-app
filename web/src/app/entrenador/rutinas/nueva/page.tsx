import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { RoutineForm } from "@/components/trainer/routine-form";
import type { ExerciseOption } from "@/lib/types/routine";

export default async function NewRoutinePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: exercises } = await supabase
    .from("exercises")
    .select("id, name, muscle_group, equipment, video_url")
    // Solo mi biblioteca (esenciales de Aretia + los míos) — el resto de
    // la comunidad se agrega desde la biblioteca antes de poder usarse aquí.
    .or(`trainer_id.is.null,trainer_id.eq.${user.id}`)
    .order("name");

  return (
    <RoutineForm
      mode="create"
      exerciseCatalog={(exercises ?? []) as ExerciseOption[]}
      trainerId={user.id}
    />
  );
}
