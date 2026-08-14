"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { clientNavItems } from "@/lib/nav-items";
import { cn } from "@/lib/utils";

/**
 * Navegación inferior de 5 pestañas del panel de cliente — Inicio,
 * Agenda, Entrenamiento, Nutrición, Perfil. Flota sobre el contenido
 * (separada de los bordes y de abajo) y la pestaña activa se expande
 * en una píldora con su nombre; las demás quedan solo con el ícono.
 */
export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-3 bottom-3 z-40 mx-auto max-w-md">
      <ul className="flex items-center justify-between gap-1 rounded-full border bg-card/95 p-1.5 shadow-lg backdrop-blur-md">
        {clientNavItems.map((item) => {
          const active =
            item.href === "/cliente" ? pathname === "/cliente" : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <li key={item.href} className="min-w-0">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-1.5 rounded-full py-2.5 transition-colors duration-300 ease-out",
                  active
                    ? "bg-foreground pr-3.5 pl-3 text-background"
                    : "px-3 text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="size-5 shrink-0" />
                <span
                  className={cn(
                    "grid transition-[grid-template-columns] duration-300 ease-out",
                    active ? "grid-cols-[1fr]" : "grid-cols-[0fr]",
                  )}
                >
                  <span className="overflow-hidden">
                    <span
                      className={cn(
                        "block text-xs font-medium whitespace-nowrap transition-opacity duration-200",
                        active ? "opacity-100 delay-100" : "opacity-0",
                      )}
                    >
                      {item.label}
                    </span>
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
