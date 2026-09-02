import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Cliente aparte, solo para el flujo de "olvidé mi contraseña"
 * (/recuperar y /recuperar/actualizar) — con flowType "implicit" en vez
 * del "pkce" que @supabase/ssr fuerza sin excepción en el cliente normal
 * de la app (@/lib/supabase/client.ts, usado en todo lo demás).
 *
 * Por qué no usar el cliente normal aquí: con flowType pkce, el enlace
 * del correo trae "?code=..." y solo se puede canjear con una llave
 * (code_verifier) guardada en el navegador/dispositivo exacto donde se
 * pidió el cambio — si el correo se abre en otro navegador (el caso
 * normal en celular: se pide desde la PWA instalada, se abre desde
 * Gmail), el canje falla y el enlace se ve "vencido" aunque sea válido.
 * La forma "correcta" de evitar esto (que la plantilla de correo use
 * token_hash y una ruta propia) necesita SMTP propio, que es de pago en
 * Supabase y no lo tenemos activado.
 *
 * Con flowType implicit el enlace trae la sesión directo en el
 * fragmento de la URL (#access_token=...) sin generar ningún
 * code_verifier que guardar — no depende de nada local, así que
 * funciona sin importar en qué navegador se abra. persistSession en
 * false a propósito: es una sesión de un solo uso (poner la contraseña
 * nueva y ya), no hace falta dejarla en localStorage.
 */
export function createRecoveryClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        flowType: "implicit",
        persistSession: false,
        detectSessionInUrl: true,
      },
    },
  );
}
