import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { ClientOnboardingFlow } from "@/components/auth/client-onboarding-flow";

export default async function ClientOnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, role, gender, height_cm, weekly_training_frequency, onboarding_completed_at")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "client") {
    redirect(profile?.role === "trainer" ? "/entrenador" : "/cliente");
  }
  // Ya hizo su onboarding — no tiene nada que hacer aquí de nuevo.
  if (profile.onboarding_completed_at) redirect("/cliente");

  return (
    <ClientOnboardingFlow
      userId={user.id}
      initialFullName={profile.full_name || ""}
      initialGender={profile.gender}
      initialHeightCm={profile.height_cm}
      initialWeeklyFrequency={profile.weekly_training_frequency}
    />
  );
}
