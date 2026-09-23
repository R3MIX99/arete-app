import { notFound, redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { NewMeasurementForm } from "@/components/trainer/new-measurement-form";

export default async function NewMeasurementPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ back?: string }>;
}) {
  const { id } = await params;
  const { back } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: client } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", id)
    .eq("role", "client")
    .single();
  if (!client) notFound();

  // Solo se acepta una ruta interna propia: nunca una URL externa que
  // venga de la query string.
  const backHref = back?.startsWith("/entrenador/") ? back : `/entrenador/clientes/${id}`;

  return (
    <NewMeasurementForm
      clientId={id}
      trainerId={user.id}
      clientName={client.full_name}
      backHref={backHref}
    />
  );
}
