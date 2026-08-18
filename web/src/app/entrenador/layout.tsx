import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { SidebarNav } from "@/components/trainer/sidebar-nav";
import { TopBar } from "@/components/trainer/top-bar";

export default async function TrainerLayout({
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
    .select("full_name, email, role, business_name, business_logo_path, onboarding_completed_at")
    .eq("id", user.id)
    .single();

  // El superadmin ve la actividad de TODOS los entrenadores por las
  // policies de RLS que le dan lectura amplia — si entrara aquí vería
  // mezclados los clientes/rutinas/planes de cualquier entrenador, no
  // los suyos (porque no es dueño de nada). Este panel es solo para
  // quien de verdad tiene role = 'trainer'.
  if (profile?.role === "client") redirect("/cliente");
  if (profile?.role === "superadmin") redirect("/superadmin");
  if (profile && !profile.onboarding_completed_at) redirect("/onboarding/entrenador");

  const userName = profile?.full_name || user.email || "Entrenador";
  const userEmail = profile?.email || user.email || "";
  const brandName = profile?.business_name || "Aretia";
  const brandLogoUrl = profile?.business_logo_path
    ? supabase.storage.from("business-logos").getPublicUrl(profile.business_logo_path).data
        .publicUrl
    : null;

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      <SidebarNav
        userName={userName}
        userEmail={userEmail}
        brandName={brandName}
        brandLogoUrl={brandLogoUrl}
      />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <TopBar
          userName={userName}
          userEmail={userEmail}
          brandName={brandName}
          brandLogoUrl={brandLogoUrl}
        />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
