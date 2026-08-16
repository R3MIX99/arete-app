"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { clientNavItems } from "@/lib/nav-items";
import { cn } from "@/lib/utils";

/**
 * Navegación inferior de 5 pestañas del panel de cliente — Inicio,
 * Agenda, Historial, Nutrición, Perfil. Flota sobre el contenido
 * (separada de los bordes y de abajo) y la pestaña activa se expande
 * en una píldora con su nombre; las demás quedan solo con el ícono.
 *
 * La animación arranca al toque (estado optimista `pending`), no
 * cuando `usePathname()` refleja la nueva ruta — eso solo ocurre tras
 * ir y volver al servidor por la página nueva, lo que se sentía como
 * un retraso perceptible antes de que la píldora se expandiera.
 */
export function BottomNav() {
  const pathname = usePathname();
  const [pending, setPending] = useState<string | null>(null);
  const [lastPathname, setLastPathname] = useState(pathname);

  // En cuanto la navegación real llega a la ruta que tocamos, soltamos
  // el estado optimista para que vuelva a seguir a `pathname` — ajustado
  // durante el render (sin efecto) siguiendo el patrón recomendado de
  // React para resetear estado cuando cambia una prop derivada.
  if (pathname !== lastPathname) {
    setLastPathname(pathname);
    setPending(null);
  }

  const activePath = pending ?? pathname;

  return (
    // w-fit + inset-x-0: la píldora se encoge a lo que miden sus
    // pestañas y queda centrada, en vez de estirarse de borde a borde.
    <nav className="fixed inset-x-0 bottom-3 z-40 mx-auto w-fit max-w-[calc(100vw-1.5rem)] px-3">
      <ul className="flex items-center gap-1 rounded-full border bg-card/95 p-1.5 shadow-lg backdrop-blur-md">
        {clientNavItems.map((item) => {
          const active =
            item.href === "/cliente" ? activePath === "/cliente" : activePath.startsWith(item.href);
          const Icon = item.icon;
          return (
            <li key={item.href} className="min-w-0">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                onClick={() => setPending(item.href)}
                className={cn(
                  "flex items-center gap-1.5 rounded-full py-2.5 transition-colors duration-200 ease-out",
                  active
                    ? "bg-foreground pr-3.5 pl-3 text-background"
                    : "px-3 text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="size-5 shrink-0" />
                <span
                  className={cn(
                    "grid transition-[grid-template-columns] duration-200 ease-out",
                    active ? "grid-cols-[1fr]" : "grid-cols-[0fr]",
                  )}
                >
                  <span className="overflow-hidden">
                    <span
                      className={cn(
                        "block text-xs font-medium whitespace-nowrap transition-opacity duration-150",
                        active ? "opacity-100 delay-75" : "opacity-0",
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
