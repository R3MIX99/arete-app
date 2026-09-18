import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { SupportForm } from "@/components/support/support-form";

export default async function TrainerSupportPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email")
    .eq("id", user.id)
    .maybeSingle();

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-4 pb-24 md:p-8">
      <div>
        <h1 className="text-xl font-semibold">Soporte</h1>
        <p className="text-sm text-muted-foreground">
          Cuéntanos qué necesitas: tu mensaje llega directo al equipo de Aretia.
        </p>
      </div>
      <SupportForm
        initialName={profile?.full_name ?? ""}
        initialEmail={profile?.email ?? ""}
        userId={user.id}
      />
    </div>
  );
}
