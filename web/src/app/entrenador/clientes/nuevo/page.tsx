import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { fetchClientUsage } from "@/lib/server/client-usage";
import { NewClientForm } from "@/components/trainer/new-client-form";
import type { SubscriptionPlan } from "@/lib/types/settings";

export default async function NewClientPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [usage, { data: profile }] = await Promise.all([
    fetchClientUsage(supabase, user.id),
    supabase.from("profiles").select("subscription_plan").eq("id", user.id).single(),
  ]);

  return (
    <NewClientForm
      trainerId={user.id}
      usage={usage}
      planKey={(profile?.subscription_plan as SubscriptionPlan | null) ?? "free"}
    />
  );
}
