import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { NewDietPlanForm } from "@/components/trainer/new-diet-plan-form";

export default async function NewDietPlanPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return <NewDietPlanForm trainerId={user.id} />;
}
