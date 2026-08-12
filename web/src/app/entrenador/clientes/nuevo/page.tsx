import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { NewClientForm } from "@/components/trainer/new-client-form";

export default async function NewClientPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return <NewClientForm trainerId={user.id} />;
}
