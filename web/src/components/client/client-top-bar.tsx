"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTheme } from "next-themes";
import { ChevronDown, Dumbbell, LogOut, Monitor, Moon, Settings, Sun } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const THEME_OPTIONS = [
  { value: "light", label: "Modo claro", icon: Sun },
  { value: "dark", label: "Modo oscuro", icon: Moon },
  { value: "system", label: "Según el sistema", icon: Monitor },
] as const;

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
  // `theme` es lo que el usuario eligió, "system" incluido. resolvedTheme
  // daría el color que acabó aplicándose, que no sirve para marcar cuál
  // de las tres opciones está seleccionada.
  const { theme, setTheme } = useTheme();

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

        <DropdownMenuContent align="start" className="w-56">
          <DropdownMenuLabel className="truncate">{userName}</DropdownMenuLabel>
          <DropdownMenuSeparator />

          <DropdownMenuItem asChild>
            <Link href="/cliente/configuracion">
              <Settings className="size-4" />
              Configuración
            </Link>
          </DropdownMenuItem>

          <DropdownMenuSeparator />
          {/* El título va arriba y los tres íconos debajo. Los botones
              son círculos del ancho de su ícono (nada de flex-1, que los
              estiraba a todo lo ancho) y el elegido se pinta con el
              color de acento, así se ve de un vistazo cuál está activo.
              Son botones normales y no DropdownMenuItem a propósito: así
              tocarlos no cierra el menú y se pueden comparar los temas
              al momento. */}
          <div className="flex flex-col gap-1.5 px-2 py-1.5">
            <span className="text-xs text-muted-foreground">Apariencia</span>
            <div className="flex items-center gap-1.5">
              {THEME_OPTIONS.map((option) => {
                const Icon = option.icon;
                const active = theme === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setTheme(option.value)}
                    aria-label={option.label}
                    aria-pressed={active}
                    title={option.label}
                    className={cn(
                      "flex size-7 items-center justify-center rounded-full transition-colors",
                      active
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground",
                    )}
                  >
                    <Icon className="size-4" />
                  </button>
                );
              })}
            </div>
          </div>

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
            className="size-7 shrink-0 rounded-lg object-cover"
          />
        ) : (
          <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Dumbbell className="size-4" />
          </div>
        )}
      </div>
    </header>
  );
}
