import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

/**
 * Vuelta del login OAuth (por ahora, solo Google). GoTrue redirige aquí con
 * ?code=..., que se cambia por una sesión real.
 *
 * ?next=<ruta> manda de vuelta a una pantalla concreta ya con sesión — lo
 * usa, por ejemplo, la invitación de cliente (/registro/invitacion/[token]),
 * cuyo propio formulario ya sabe canjear el token una vez que hay usuario
 * autenticado.
 *
 * ?intent=trainer_signup es el caso especial de "Registrarme como
 * entrenador con Google" desde /registro: el trigger handle_new_user()
 * crea el perfil nuevo con role='client' por defecto (no tiene forma de
 * saber la intención antes de que exista sesión) — si el perfil sigue
 * "en blanco" (sin trainer, sin onboarding hecho) se pasa a entrenador
 * aquí mismo, una sola vez.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next");
  const intent = searchParams.get("intent");

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=oauth`);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.user) {
    return NextResponse.redirect(`${origin}/login?error=oauth`);
  }

  if (intent === "trainer_signup") {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, trainer_id, onboarding_completed_at")
      .eq("id", data.user.id)
      .single();

    if (
      profile &&
      profile.role === "client" &&
      !profile.trainer_id &&
      !profile.onboarding_completed_at
    ) {
      await supabase.from("profiles").update({ role: "trainer" }).eq("id", data.user.id);
      return NextResponse.redirect(`${origin}/onboarding/entrenador`);
    }
  }

  if (next) {
    return NextResponse.redirect(`${origin}${next}`);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", data.user.id)
    .single();

  const destination =
    profile?.role === "client"
      ? "/cliente"
      : profile?.role === "superadmin"
        ? "/superadmin"
        : "/entrenador";

  return NextResponse.redirect(`${origin}${destination}`);
}
