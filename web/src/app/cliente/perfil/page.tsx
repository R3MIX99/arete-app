import { redirect } from "next/navigation";
import { User } from "lucide-react";

import { createClient } from "@/lib/supabase/server";

export default async function ClientProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email")
    .eq("id", user.id)
    .single();

  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-3 p-10 text-center">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <User className="size-6" />
      </div>
      <p className="font-medium">{profile?.full_name || user.email}</p>
      <p className="text-sm text-muted-foreground">{profile?.email || user.email}</p>
      <p className="mt-4 text-sm text-muted-foreground">
        Perfil, medidas y fotos de progreso — Próximamente.
      </p>
    </div>
  );
}
