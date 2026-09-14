"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, X } from "lucide-react";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

export function RevokeGymInvitationButton({ invitationId }: { invitationId: string }) {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);

  async function handleRevoke() {
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("gym_invitations")
      .update({ status: "revoked" })
      .eq("id", invitationId);
    setLoading(false);

    if (error) {
      toast.error(error.message || "No se pudo revocar la invitación.");
      return;
    }

    toast.success("Invitación revocada.");
    router.refresh();
  }

  return (
    <Button size="sm" variant="ghost" onClick={handleRevoke} disabled={loading}>
      {loading ? <Loader2 className="size-3.5 animate-spin" /> : <X className="size-3.5" />}
      Revocar
    </Button>
  );
}
