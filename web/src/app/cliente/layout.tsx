import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { ClientBottomNavGate } from "@/components/client/client-bottom-nav-gate";
import { ClientTopBar } from "@/components/client/client-top-bar";
import { LargeTextSync } from "@/components/client/large-text-sync";
import { ClientDeactivatedNotice } from "@/components/client/client-deactivated-notice";

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
    .select("full_name, role, onboarding_completed_at, status")
    .eq("id", user.id)
    .single();

  if (profile?.role === "trainer") redirect("/entrenador");
  if (profile?.role === "superadmin") redirect("/superadmin");
  if (profile && !profile.onboarding_completed_at) redirect("/onboarding/cliente");

  const deactivated = profile?.status === "inactive";

  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <LargeTextSync />
      <ClientTopBar userName={profile?.full_name || user.email || "Mi cuenta"} />
      {/* Entrenador desactivó al cliente: se le corta el acceso a su
          rutina y todo lo demás (aunque las asignaciones sigan intactas
          en la base — "Desactivar" no las borra, solo pausa el acceso)
          en vez de dejar que siga viendo y registrando sesiones con un
          entrenador que ya no lo está atendiendo. */}
      <main className="flex-1 pb-20">
        {deactivated ? <ClientDeactivatedNotice /> : children}
      </main>
      {!deactivated && <ClientBottomNavGate />}
    </div>
  );
}
