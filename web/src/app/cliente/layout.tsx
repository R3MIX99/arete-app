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
    .select("full_name, role, onboarding_completed_at")
    .eq("id", user.id)
    .single();

  if (profile?.role === "trainer") redirect("/entrenador");
  if (profile?.role === "superadmin") redirect("/superadmin");
  if (profile && !profile.onboarding_completed_at) redirect("/onboarding/cliente");

  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <ClientTopBar userName={profile?.full_name || user.email || "Mi cuenta"} />
      <main className="flex-1 pb-20">{children}</main>
      <ClientBottomNavGate />
    </div>
  );
}
