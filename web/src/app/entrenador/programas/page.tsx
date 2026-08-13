import { createClient } from "@/lib/supabase/server";
import { ProgramsBrowser } from "@/components/trainer/programs-browser";
import type { ProgramSummary } from "@/lib/types/program";

export default async function ProgramsPage() {
  const supabase = await createClient();

  const { data: programs } = await supabase
    .from("programs")
    .select("id, name, description, duration_weeks, goal, created_at")
    .order("created_at", { ascending: false });

  return <ProgramsBrowser programs={(programs ?? []) as ProgramSummary[]} />;
}
