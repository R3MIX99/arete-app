import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";

/**
 * A donde debe apuntar la plantilla de correo de "Reset Password" en el
 * dashboard de Supabase (Authentication -> Email Templates), en vez del
 * {{ .ConfirmationURL }} de default:
 *
 *   {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next={{ .RedirectTo }}
 *
 * Por qué: nuestro cliente de Supabase usa flowType "pkce" (lo fuerza
 * @supabase/ssr), así que resetPasswordForEmail() genera un enlace
 * "?code=..." que solo se puede canjear con el code_verifier guardado en
 * el navegador/dispositivo donde se pidió el reseteo — si el correo se
 * abre en otro navegador o en el sistema en vez de la PWA instalada (el
 * caso normal en un celular), el canje falla y el enlace se ve "vencido"
 * aunque se haya abierto al toque. token_hash + verifyOtp no tiene ese
 * problema: no depende de nada guardado en el dispositivo, solo del
 * propio enlace del correo.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next") ?? "/";

  if (tokenHash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/recuperar?expired=1`);
}
