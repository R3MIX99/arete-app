import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import {
  fetchActiveDietAssignment,
  fetchClientNutritionPlan,
  fetchSubstitutionsForDate,
  fetchUpcomingDietAssignmentDate,
} from "@/lib/server/client-nutrition-data";
import { ClientNutritionView } from "@/components/client/client-nutrition-view";
import { ClientDeactivatedNotice } from "@/components/client/client-deactivated-notice";

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export default async function ClientNutritionPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: ownProfile } = await supabase
    .from("profiles")
    .select("status")
    .eq("id", user.id)
    .single();
  if (ownProfile?.status === "inactive") {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-6 py-4 pb-24 md:px-8 md:py-8">
        <ClientDeactivatedNotice description="Por ahora no puedes ver tu plan nutricional. Contacta a tu entrenador si crees que es un error." />
      </div>
    );
  }

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
