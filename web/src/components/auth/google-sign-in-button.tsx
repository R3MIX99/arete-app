"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 20 20" className="size-4" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M19.6 10.23c0-.68-.06-1.36-.18-2H10v3.79h5.4a4.62 4.62 0 0 1-2 3.03v2.5h3.23c1.9-1.75 2.97-4.32 2.97-7.32Z"
      />
      <path
        fill="#34A853"
        d="M10 20c2.7 0 4.96-.89 6.62-2.42l-3.23-2.5c-.9.6-2.05.95-3.39.95-2.6 0-4.8-1.76-5.59-4.12H1.06v2.59A10 10 0 0 0 10 20Z"
      />
      <path
        fill="#FBBC05"
        d="M4.41 11.9a5.99 5.99 0 0 1 0-3.8V5.5H1.06a10 10 0 0 0 0 9l3.35-2.6Z"
      />
      <path
        fill="#EA4335"
        d="M10 3.98c1.47 0 2.79.5 3.82 1.5l2.87-2.87A9.44 9.44 0 0 0 10 0 10 10 0 0 0 1.06 5.5l3.35 2.6C5.2 5.75 7.4 3.98 10 3.98Z"
      />
    </svg>
  );
}

/**
 * Botón "Continuar con Google" — lo usan login, registro de entrenador y
 * las páginas de invitación (equipo y cliente). El route handler de vuelta
 * (/auth/callback) decide a dónde mandar según `next` / `intent`.
 */
export function GoogleSignInButton({
  next,
  intent,
  label = "Continuar con Google",
}: {
  /** Ruta a la que volver ya con sesión (p. ej. la propia página de
   *  invitación, para que su formulario canjee el token). */
  next?: string;
  /** 'trainer_signup' — única intención especial que reconoce el callback
   *  hoy: pasa el perfil recién creado de cliente a entrenador. */
  intent?: string;
  label?: string;
}) {
  const [loading, setLoading] = React.useState(false);

  async function handleClick() {
    setLoading(true);
    const supabase = createClient();
    const params = new URLSearchParams();
    if (next) params.set("next", next);
    if (intent) params.set("intent", intent);
    const query = params.toString();
    const redirectTo = `${window.location.origin}/auth/callback${query ? `?${query}` : ""}`;

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    });

    if (error) {
      setLoading(false);
      toast.error("No se pudo conectar con Google. Intenta de nuevo.");
    }
    // Sin error, el navegador ya está en camino a Google — no hay nada
    // más que hacer aquí (por eso no se apaga `loading`).
  }

  return (
    <Button
      type="button"
      variant="outline"
      className="w-full gap-2"
      disabled={loading}
      onClick={handleClick}
    >
      {loading ? <Loader2 className="size-4 animate-spin" /> : <GoogleIcon />}
      {label}
    </Button>
  );
}
