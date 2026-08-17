import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { TrainerOnboardingFlow } from "@/components/auth/trainer-onboarding-flow";

export default async function TrainerOnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, role, gender, business_name, business_logo_path, onboarding_completed_at")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "trainer") {
    redirect(profile?.role === "client" ? "/cliente" : "/entrenador");
  }
  // Ya hizo su onboarding — no tiene nada que hacer aquí de nuevo.
  if (profile.onboarding_completed_at) redirect("/entrenador");

  return (
    <TrainerOnboardingFlow
      userId={user.id}
      initialFullName={profile.full_name || ""}
      initialGender={profile.gender}
      initialBusinessName={profile.business_name}
      initialBusinessLogoPath={profile.business_logo_path}
    />
  );
}
