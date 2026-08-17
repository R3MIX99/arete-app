import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { SuperadminShell } from "@/components/superadmin/superadmin-shell";

export default async function SuperadminLayout({
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
    .select("full_name, email, role")
    .eq("id", user.id)
    .single();

  // Solo el superadmin entra aquí. Este guard es de navegación (evita
  // que alguien llegue a una pantalla que no le toca); lo que de verdad
  // protege los datos son las policies de RLS, que ya filtran por rol.
  if (profile?.role !== "superadmin") {
    redirect(profile?.role === "client" ? "/cliente" : "/entrenador");
  }

  return (
    <SuperadminShell
      userName={profile.full_name || user.email || "Superadmin"}
      userEmail={profile.email || user.email || ""}
    >
      {children}
    </SuperadminShell>
  );
}
