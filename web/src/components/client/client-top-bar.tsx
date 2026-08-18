"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronDown, Dumbbell, LogOut, Settings } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ThemePicker } from "@/components/theme-picker";

/** Iniciales para el círculo del avatar — dos como mucho, que es lo que
 * se alcanza a leer ("Cliente de Prueba" → "CP"). */
function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("");
}

export function ClientTopBar({
  userName,
  brandName,
  brandLogoUrl,
}: {
  userName: string;
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
    <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b px-4">
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label="Abrir menú de perfil"
          className="group flex min-w-0 items-center gap-2 rounded-full py-1 pr-2 pl-1 text-left transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/12 text-xs font-semibold text-primary">
            {initials(userName)}
          </span>
          <span className="truncate text-sm font-medium">{userName}</span>
          <ChevronDown className="size-3.5 shrink-0 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
        </DropdownMenuTrigger>

        {/* Se ajusta a su contenido en vez de un ancho fijo (antes w-56,
            que dejaba un hueco a la derecha). min-w-0 anula el mínimo de
            10rem que trae el componente base, y whitespace-nowrap evita
            que al encoger los textos se partan en dos renglones. El
            max-w es el tope para un nombre muy largo: ahí sí se recorta
            con puntos suspensivos en vez de desbordar la pantalla. */}
        <DropdownMenuContent
          align="start"
          className="w-auto min-w-0 max-w-[calc(100vw-2rem)] whitespace-nowrap"
        >
          {/* El nombre no se repite aquí: ya se lee en el botón que abre
              este menú, justo arriba. Los íconos de tema son botones
              normales y no DropdownMenuItem a propósito: así tocarlos no
              cierra el menú y se pueden comparar los temas al momento. */}
          <div className="flex flex-col gap-1.5 px-2 py-1.5">
            <span className="text-xs text-muted-foreground">Apariencia</span>
            <ThemePicker />
          </div>

          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href="/cliente/configuracion">
              <Settings className="size-4" />
              Configuración
            </Link>
          </DropdownMenuItem>

          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={handleLogout}
            className="text-destructive focus:text-destructive"
          >
            <LogOut className="size-4" />
            Cerrar sesión
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="flex min-w-0 shrink-0 items-center gap-2">
        <span className="hidden truncate text-sm font-semibold sm:inline">{brandName}</span>
        {brandLogoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={brandLogoUrl}
            alt={brandName}
            className="size-9 shrink-0 rounded-lg object-cover"
          />
        ) : (
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Dumbbell className="size-5" />
          </div>
        )}
      </div>
    </header>
  );
}
