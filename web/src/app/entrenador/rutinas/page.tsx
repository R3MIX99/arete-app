import { createClient } from "@/lib/supabase/server";
import { RoutinesBrowser } from "@/components/trainer/routines-browser";
import type { RoutineSummary } from "@/lib/types/routine";

export default async function RoutinesPage() {
  const supabase = await createClient();

  const { data: routines } = await supabase
    .from("routines")
    .select("id, name, description, level, goal, created_at, routine_exercises(count)")
    .order("created_at", { ascending: false });

  return <RoutinesBrowser routines={(routines ?? []) as RoutineSummary[]} />;
}
