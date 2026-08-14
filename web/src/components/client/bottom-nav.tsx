"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { clientNavItems } from "@/lib/nav-items";
import { cn } from "@/lib/utils";

/**
 * Navegación inferior de 4 pestañas del panel de cliente — Inicio,
 * Entrenamiento, Nutrición, Perfil (ver Fase 9-11 del documento de
 * fases). Fija abajo, pensada primero para teléfono.
 */
export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-card/95 backdrop-blur-sm">
      <ul className="mx-auto flex max-w-md items-stretch justify-around">
        {clientNavItems.map((item) => {
          const active =
            item.href === "/cliente" ? pathname === "/cliente" : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                className={cn(
                  "flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors",
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="size-5" />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
