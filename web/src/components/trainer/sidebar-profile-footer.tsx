"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

function initialsOf(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

/**
 * Pie de la barra lateral: el perfil del entrenador y cerrar sesión.
 * Reemplaza el círculo de usuario que antes vivía en la barra superior —
 * ahora la identidad vive en un solo lugar, junto a la navegación.
 */
export function SidebarProfileFooter({
  userName,
  userEmail,
  collapsed = false,
}: {
  userName: string;
  userEmail: string;
  collapsed?: boolean;
}) {
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  const avatar = (
    <Avatar className="size-8 shrink-0">
      <AvatarFallback className="text-[11px]">
        {initialsOf(userName) || "?"}
      </AvatarFallback>
    </Avatar>
  );

  const logoutButton = (
    <button
      type="button"
      onClick={handleLogout}
      aria-label="Cerrar sesión"
      className="flex size-8 shrink-0 items-center justify-center rounded-lg transition-colors"
      style={{ color: "var(--sb-text-muted)" }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "var(--sb-hover)";
        e.currentTarget.style.color = "var(--sb-text)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "transparent";
        e.currentTarget.style.color = "var(--sb-text-muted)";
      }}
    >
      <LogOut className="size-4" />
    </button>
  );

  if (collapsed) {
    return (
      <div className="flex flex-col items-center gap-2 p-2.5">
        <Tooltip>
          <TooltipTrigger asChild>{avatar}</TooltipTrigger>
          <TooltipContent side="right">
            <div className="flex flex-col">
              <span className="font-semibold">{userName}</span>
              <span className="opacity-70">{userEmail}</span>
            </div>
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>{logoutButton}</TooltipTrigger>
          <TooltipContent side="right">Cerrar sesión</TooltipContent>
        </Tooltip>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2.5 p-2.5">
      {avatar}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium" style={{ color: "var(--sb-text)" }}>
          {userName}
        </p>
        <p className="truncate text-xs" style={{ color: "var(--sb-text-muted)" }}>
          {userEmail}
        </p>
      </div>
      <Tooltip>
        <TooltipTrigger asChild>{logoutButton}</TooltipTrigger>
        <TooltipContent side="right">Cerrar sesión</TooltipContent>
      </Tooltip>
    </div>
  );
}
