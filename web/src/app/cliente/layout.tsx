import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { ClientBottomNavGate } from "@/components/client/client-bottom-nav-gate";
import { ClientTopBar } from "@/components/client/client-top-bar";

export default async function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role, trainer_id, onboarding_completed_at")
    .eq("id", user.id)
    .single();

  if (profile?.role === "trainer") redirect("/entrenador");
  if (profile?.role === "superadmin") redirect("/superadmin");
  if (profile && !profile.onboarding_completed_at) redirect("/onboarding/cliente");

  let brandName = "Areté";
  let brandLogoUrl: string | null = null;
  if (profile?.trainer_id) {
    const { data: trainer } = await supabase
      .from("profiles")
      .select("business_name, business_logo_path")
      .eq("id", profile.trainer_id)
      .single();
    brandName = trainer?.business_name || "Areté";
    brandLogoUrl = trainer?.business_logo_path
      ? supabase.storage.from("business-logos").getPublicUrl(trainer.business_logo_path).data
          .publicUrl
      : null;
  }

  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <ClientTopBar
        userName={profile?.full_name || user.email || "Mi cuenta"}
        brandName={brandName}
        brandLogoUrl={brandLogoUrl}
      />
      <main className="flex-1 pb-20">{children}</main>
      <ClientBottomNavGate />
    </div>
  );
}
