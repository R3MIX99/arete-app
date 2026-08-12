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
    .select("full_name, email, role")
    .eq("id", user.id)
    .single();

  if (profile?.role === "client") redirect("/cliente");

  const userName = profile?.full_name || user.email || "Entrenador";
  const userEmail = profile?.email || user.email || "";

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      <SidebarNav userName={userName} userEmail={userEmail} />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <TopBar userName={userName} userEmail={userEmail} />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
