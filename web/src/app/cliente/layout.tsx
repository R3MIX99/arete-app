import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { ClientBottomNavGate } from "@/components/client/client-bottom-nav-gate";
import { outfit } from "@/lib/fonts";
import { ClientProfileProvider } from "@/components/client/client-profile-context";
import { ClientTopBar } from "@/components/client/client-top-bar";
import { LargeTextSync } from "@/components/client/large-text-sync";

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
    .select("full_name, role, onboarding_completed_at, avatar_url")
    .eq("id", user.id)
    .single();

  if (profile?.role === "trainer") redirect("/entrenador");
  if (profile?.role === "superadmin") redirect("/superadmin");
  if (profile && !profile.onboarding_completed_at) redirect("/onboarding/cliente");

  // Foto de perfil: la del perfil y, si no hay, la de la cuenta de Google.
  const metadata = user.user_metadata as { avatar_url?: string; picture?: string } | undefined;
  const avatarUrl = profile?.avatar_url || metadata?.avatar_url || metadata?.picture || null;
  const displayName = profile?.full_name || user.email || "Mi cuenta";

  return (
    <ClientProfileProvider value={{ name: displayName, avatarUrl }}>
      <div className={`${outfit.className} flex min-h-screen w-full flex-col bg-background`}>
        <LargeTextSync />
        <ClientTopBar />
        <main className="flex-1 pb-24">{children}</main>
        <ClientBottomNavGate />
      </div>
    </ClientProfileProvider>
  );
}
