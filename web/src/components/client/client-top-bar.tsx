"use client";

import { usePathname } from "next/navigation";

import { ClientProfileMenu } from "@/components/client/client-profile-menu";

/** Barra superior de las pantallas del cliente distintas al inicio: solo el
 * avatar con su menú, a la derecha. El inicio no la usa porque lleva su
 * propio encabezado con el saludo. */
export function ClientTopBar() {
  const pathname = usePathname();
  if (pathname === "/cliente") return null;

  return (
    <header className="flex h-16 shrink-0 items-center justify-end px-5">
      <ClientProfileMenu />
    </header>
  );
}
