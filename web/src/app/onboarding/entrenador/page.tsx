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
    .select(
      "id, full_name, role, gender, business_name, business_logo_path, onboarding_completed_at, gym_id",
    )
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
      // Un empleado que ya se unió a un gimnasio (vía invitación) no
      // tiene marca propia — usa la del gimnasio. No tiene sentido
      // pedirle logo/nombre de negocio en su propio onboarding.
      skipBusinessStep={Boolean(profile.gym_id)}
    />
  );
}
