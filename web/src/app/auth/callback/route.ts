import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { logActivityServer } from "@/lib/server/log-activity";

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
 *
 * Cada rama queda registrada en /superadmin/logs (acción "auth.*", con
 * provider: "google" en el contexto) — este salto nunca pasa por una
 * pantalla con logActivity() del lado del cliente, porque el navegador va
 * directo de Google de vuelta al servidor, así que sin esto no quedaba
 * ningún rastro de logins con Google (ni de los que fallan) en la bitácora.
 */
export async function GET(request: Request) {
  const startedAt = performance.now();
  const { searchParams, origin: requestOrigin } = new URL(request.url);
  // Detrás del proxy de Coolify (Traefik), el origin que Next.js calcula a
  // partir de request.url no siempre refleja el dominio público real —
  // según la conexión, a veces se ve algo interno del contenedor en vez de
  // https://app.aretia.com.mx, y GoTrue termina mandando al cliente a un
  // dominio que no existe fuera del VPS. x-forwarded-host/-proto sí traen
  // siempre el dominio con el que entró la petición original.
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto") ?? "https";
  const origin = forwardedHost ? `${forwardedProto}://${forwardedHost}` : requestOrigin;
  const code = searchParams.get("code");
  const next = searchParams.get("next");
  const intent = searchParams.get("intent");

  // Contexto común a todos los logs de esta petición — así queda visible en
  // /superadmin/logs exactamente qué origin se calculó y con qué headers,
  // que es justo lo que hubiera hecho falta para diagnosticar más rápido el
  // bug del redirect a localhost que ya arreglamos.
  const baseContext = {
    provider: "google",
    origin,
    requestOrigin,
    forwardedHost,
    next,
    intent,
  };

  const supabase = await createClient();

  if (!code) {
    await logActivityServer(supabase, request, {
      action: "auth.login_failed",
      category: "auth",
      severity: "warning",
      message: "Vuelta de Google sin código de autorización",
      startedAt,
      context: { ...baseContext, reason: "sin_code" },
    });
    return NextResponse.redirect(`${origin}/login?error=oauth`);
  }

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.user) {
    await logActivityServer(supabase, request, {
      action: "auth.login_failed",
      category: "auth",
      severity: "error",
      message: "No se pudo canjear el código de Google por una sesión",
      startedAt,
      context: { ...baseContext, reason: error?.message ?? "sin usuario" },
    });
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
      await logActivityServer(supabase, request, {
        action: "auth.trainer_signup",
        category: "auth",
        severity: "success",
        message: "Nueva cuenta de entrenador con Google",
        startedAt,
        context: { ...baseContext, path: "/onboarding/entrenador" },
      });
      return NextResponse.redirect(`${origin}/onboarding/entrenador`);
    }
  }

  if (next) {
    await logActivityServer(supabase, request, {
      action: "auth.login",
      category: "auth",
      severity: "success",
      message: "Inicio de sesión con Google",
      startedAt,
      context: { ...baseContext, path: next },
    });
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

  await logActivityServer(supabase, request, {
    action: "auth.login",
    category: "auth",
    severity: "success",
    message: "Inicio de sesión con Google",
    startedAt,
    context: { ...baseContext, path: destination, role: profile?.role ?? null },
  });

  return NextResponse.redirect(`${origin}${destination}`);
}
