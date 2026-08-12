import { notFound } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { ClientDetail } from "@/components/trainer/client-detail";
import type { ClientProfile } from "@/lib/types/client";

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: client } = await supabase
    .from("profiles")
    .select("id, full_name, email, phone, goal, health_notes, status, created_at")
    .eq("id", id)
    .eq("role", "client")
    .single();

  if (!client) notFound();

  return <ClientDetail client={client as ClientProfile} />;
}
