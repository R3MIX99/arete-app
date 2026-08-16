import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { ClientProfileView } from "@/components/client/client-profile-view";
import type { AssignedTrainer, ClientProfileSettings } from "@/lib/types/client-profile";
import type { ProgressMeasurement } from "@/lib/types/progress";

export default async function ClientProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "id, full_name, email, phone, goal, health_notes, trainer_id, notify_workout_reminders, notify_meal_reminders, subscription_plan, subscription_status, deletion_requested_at",
    )
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/login");

  // El entrenador solo se pide si de verdad hay uno asignado — un
  // cliente puede quedarse sin entrenador (trainer_id se pone en null
  // si su entrenador se elimina).
  const [{ data: trainer }, { data: measurements }] = await Promise.all([
    profile.trainer_id
      ? supabase
          .from("profiles")
          .select("full_name, email, phone, business_name, business_logo_path")
          .eq("id", profile.trainer_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    supabase
      .from("progress_measurements")
      .select("id, entry_date, metric_key, value, notes")
      .eq("client_id", user.id)
      .order("entry_date"),
  ]);

  return (
    <ClientProfileView
      profile={profile as unknown as ClientProfileSettings}
      trainer={(trainer as AssignedTrainer | null) ?? null}
      measurements={(measurements ?? []) as ProgressMeasurement[]}
    />
  );
}
