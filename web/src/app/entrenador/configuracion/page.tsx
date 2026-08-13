import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { TrainerSettingsForm } from "@/components/trainer/trainer-settings-form";
import type { TrainerSettings } from "@/lib/types/settings";

export default async function ConfiguracionPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "id, full_name, email, phone, business_name, notify_email, notify_push, subscription_plan, subscription_status",
    )
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/login");

  return <TrainerSettingsForm settings={profile as TrainerSettings} />;
}
