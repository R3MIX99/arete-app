import { notFound } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { GymInvitationAcceptForm } from "@/components/auth/gym-invitation-accept-form";
import type { GymRole } from "@/lib/types/gyms";

interface GymInvitationPreview {
  id: string;
  email: string;
  invited_role: GymRole;
  status: string;
  gym_name: string;
}

export default async function GymInvitationPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("get_gym_invitation_preview", {
    p_token: token,
  });

  const invitation = (data?.[0] ?? null) as GymInvitationPreview | null;

  if (error || !invitation) notFound();

  return <GymInvitationAcceptForm token={token} invitation={invitation} />;
}
