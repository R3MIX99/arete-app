"use client";

import { useRouter } from "next/navigation";
import { Dumbbell, LogOut } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

export function ClientTopBar({
  brandName,
  brandLogoUrl,
}: {
  brandName: string;
  brandLogoUrl: string | null;
}) {
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b px-4">
      <div className="flex min-w-0 items-center gap-2.5">
        {brandLogoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={brandLogoUrl} alt="" className="size-7 shrink-0 rounded-lg object-cover" />
        ) : (
          <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Dumbbell className="size-4" />
          </div>
        )}
        <span className="truncate text-sm font-semibold">{brandName}</span>
      </div>
      <Button
        variant="ghost"
        size="icon"
        aria-label="Cerrar sesión"
        onClick={handleLogout}
        className="text-muted-foreground"
      >
        <LogOut className="size-4" />
      </Button>
    </header>
  );
}
