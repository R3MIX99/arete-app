import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { NewDishForm } from "@/components/trainer/new-dish-form";

export default async function NewDishPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return <NewDishForm trainerId={user.id} />;
}
