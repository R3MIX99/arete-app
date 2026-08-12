import Link from "next/link";
import type { LucideIcon } from "lucide-react";

/**
 * Botón flotante circular para "agregar", solo en teléfono — en
 * escritorio ese mismo acceso vive como botón normal junto al buscador.
 * Fijo abajo a la derecha; la página que lo usa debe dejarle espacio con
 * padding-bottom para que no tape la última fila de la lista.
 */
export function MobileFab({
  href,
  icon: Icon,
  label,
}: {
  href: string;
  icon: LucideIcon;
  label: string;
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      className="fixed right-5 bottom-5 z-40 flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 transition-transform active:scale-95 md:hidden"
    >
      <Icon className="size-6" />
    </Link>
  );
}
