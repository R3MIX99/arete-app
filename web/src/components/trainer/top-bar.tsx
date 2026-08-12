"use client";

import { usePathname } from "next/navigation";

import { trainerNavItems } from "@/lib/nav-items";
import { MobileNav } from "@/components/trainer/mobile-nav";

/**
 * Barra superior: solo el título de la página y, en teléfono, el botón
 * que abre el menú. El perfil y cerrar sesión viven en la barra lateral
 * (ver `SidebarProfileFooter`), no aquí — un solo lugar para la
 * identidad del entrenador.
 */
export function TopBar({
  userName,
  userEmail,
}: {
  userName: string;
  userEmail: string;
}) {
  const pathname = usePathname();

  const title =
    trainerNavItems.find((item) =>
      item.href === "/entrenador" ? pathname === "/entrenador" : pathname.startsWith(item.href),
    )?.label ?? "Areté";

  return (
    <header className="flex h-16 shrink-0 items-center gap-2 border-b border-border px-4 md:px-6">
      <MobileNav userName={userName} userEmail={userEmail} />
      <h1 className="text-base font-semibold">{title}</h1>
    </header>
  );
}
