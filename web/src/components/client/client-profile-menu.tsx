"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, LogOut, Settings, User } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { outfit } from "@/lib/fonts";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ThemePicker } from "@/components/theme-picker";
import { ClientAvatar } from "@/components/client/client-avatar";
import { useClientProfile } from "@/components/client/client-profile-context";

/** Evento que lanza la pantalla de notificaciones al marcarlas como leídas,
 * para que el punto del avatar se apague sin recargar. */
export const NOTIFICATIONS_READ_EVENT = "client-notifications-read";

/** Menú del avatar del cliente: perfil, configuración, notificaciones, tema
 * y cerrar sesión. Un punto sobre el avatar avisa que hay notificaciones
 * sin leer. */
export function ClientProfileMenu({ className }: { className?: string }) {
  const router = useRouter();
  const { name, avatarUrl } = useClientProfile();
  const supabase = React.useMemo(() => createClient(), []);
  const [unread, setUnread] = React.useState(0);

  React.useEffect(() => {
    let cancelled = false;
    async function refresh() {
      const { count } = await supabase
        .from("client_notifications")
        .select("id", { count: "exact", head: true })
        .is("read_at", null);
      if (!cancelled) setUnread(count ?? 0);
    }
    void refresh();
    const onRead = () => void refresh();
    window.addEventListener(NOTIFICATIONS_READ_EVENT, onRead);
    return () => {
      cancelled = true;
      window.removeEventListener(NOTIFICATIONS_READ_EVENT, onRead);
    };
  }, [supabase]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Abrir menú de perfil"
        className={cn(
          "relative rounded-full focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none",
          className,
        )}
      >
        <ClientAvatar name={name} avatarUrl={avatarUrl} />
        {unread > 0 ? (
          <span
            className="absolute top-0 right-0 size-3 rounded-full border-2 border-background bg-primary"
            aria-label="Tienes notificaciones sin leer"
          />
        ) : null}
      </DropdownMenuTrigger>

      {/* El contenido se monta fuera del panel, así que lleva su propia
          clase de fuente. */}
      <DropdownMenuContent align="end" className={cn("w-52 rounded-2xl p-2", outfit.className)}>
        <DropdownMenuItem asChild className="gap-3 rounded-lg py-2">
          <Link href="/cliente/configuracion#datos-personales">
            <User className="size-4 text-muted-foreground" />
            Perfil
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild className="gap-3 rounded-lg py-2">
          <Link href="/cliente/configuracion#ajustes">
            <Settings className="size-4 text-muted-foreground" />
            Configuración
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild className="gap-3 rounded-lg py-2">
          <Link href="/cliente/notificaciones">
            <Bell className="size-4 text-muted-foreground" />
            <span className="flex-1">Notificaciones</span>
            {unread > 0 ? (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-semibold text-primary-foreground">
                {unread > 9 ? "9+" : unread}
              </span>
            ) : null}
          </Link>
        </DropdownMenuItem>

        {/* El selector de tema no es un DropdownMenuItem a propósito: así
            tocarlo no cierra el menú y se pueden comparar los temas. */}
        <div className="px-2 py-2">
          <ThemePicker className="w-fit rounded-full bg-muted p-1" />
        </div>

        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={handleLogout}
          className="gap-3 rounded-lg py-2 text-destructive focus:text-destructive"
        >
          <LogOut className="size-4" />
          Cerrar sesión
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
