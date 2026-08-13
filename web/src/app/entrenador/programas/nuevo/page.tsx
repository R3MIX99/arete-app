import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { NewProgramForm } from "@/components/trainer/new-program-form";

export default async function NewProgramPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return <NewProgramForm trainerId={user.id} />;
}
