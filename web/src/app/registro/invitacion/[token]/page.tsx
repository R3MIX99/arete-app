import { notFound } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { InvitationAcceptForm } from "@/components/auth/invitation-accept-form";

interface InvitationPreview {
  id: string;
  email: string;
  full_name: string | null;
  goal: string | null;
  status: string;
  trainer_name: string;
  business_name: string | null;
}

export default async function InvitationPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("get_invitation_preview", {
    p_token: token,
  });

  const invitation = (data?.[0] ?? null) as InvitationPreview | null;

  if (error || !invitation) notFound();

  return <InvitationAcceptForm token={token} invitation={invitation} />;
}
