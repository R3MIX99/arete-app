import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import {
  fetchActiveDietAssignment,
  fetchClientNutritionPlan,
  fetchSubstitutionsForDate,
  fetchUpcomingDietAssignmentDate,
} from "@/lib/server/client-nutrition-data";
import { ClientNutritionView } from "@/components/client/client-nutrition-view";

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export default async function ClientNutritionPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const assignment = await fetchActiveDietAssignment(supabase, user.id);
  const [plan, substitutions, upcomingStartDate] = await Promise.all([
    assignment ? fetchClientNutritionPlan(supabase, assignment) : Promise.resolve(null),
    assignment
      ? fetchSubstitutionsForDate(supabase, user.id, todayIso())
      : Promise.resolve([]),
    assignment ? Promise.resolve(null) : fetchUpcomingDietAssignmentDate(supabase, user.id),
  ]);

  return (
    <ClientNutritionView
      clientId={user.id}
      trainerId={assignment?.trainer_id ?? ""}
      plan={plan}
      initialSubstitutions={substitutions}
      upcomingStartDate={upcomingStartDate}
    />
  );
}
