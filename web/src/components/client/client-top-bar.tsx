"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { ClientProfileMenu } from "@/components/client/client-profile-menu";

/** Barra superior de las pantallas del cliente distintas al inicio: el
 * ícono pequeño de Aretia a la izquierda (lleva al inicio) y el avatar
 * pequeño con su menú a la derecha. El inicio no la usa porque lleva su
 * propio encabezado con el saludo. */
export function ClientTopBar() {
  const pathname = usePathname();
  if (pathname === "/cliente") return null;

  return (
    <header className="flex h-14 shrink-0 items-center justify-between px-5">
      <Link href="/cliente" aria-label="Ir al inicio" className="flex items-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/aretia-icon-black.png" alt="" className="size-7 object-contain dark:hidden" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/aretia-icon-white.png" alt="" className="hidden size-7 object-contain dark:block" />
      </Link>
      <ClientProfileMenu avatarClassName="size-8 text-[11px]" />
    </header>
  );
}
