import { Browser } from "@capacitor/browser";

import { createClient } from "@/lib/supabase/client";

/** Enlace al que GoTrue devuelve la sesión de Google cuando el login se
 * hizo desde la app nativa. Debe estar en la lista de destinos permitidos de
 * GoTrue (GOTRUE_URI_ALLOW_LIST) y registrado como esquema en Android
 * (AndroidManifest.xml) e iOS (Info.plist). */
export const NATIVE_OAUTH_REDIRECT = "mx.aretia.app://auth";

const PENDING_KEY = "aretia_native_oauth";
const HANDLED_KEY = "aretia_native_oauth_handled";

interface PendingLogin {
  next?: string;
  intent?: string;
}

/** Google bloquea el login dentro de un WebView (error disallowed_useragent),
 * así que en la app nativa se abre en el navegador del sistema (Chrome
 * Custom Tabs). La página de Google termina en NATIVE_OAUTH_REDIRECT y
 * Android abre la app con ese enlace (ver handleNativeOAuthUrl).
 *
 * `next` e `intent` se guardan aparte en lugar de ir en la URL de regreso,
 * porque la lista de destinos permitidos de GoTrue compara la URL completa. */
export async function startNativeGoogleLogin(pending: PendingLogin): Promise<{ error: string | null }> {
  const supabase = createClient();
  // skipBrowserRedirect: solo se pide la URL de Google (y se guarda el
  // verificador PKCE en las cookies del WebView, que es donde se canjeará
  // el código); quien abre el navegador es Browser.open.
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: NATIVE_OAUTH_REDIRECT, skipBrowserRedirect: true },
  });
  if (error || !data.url) return { error: error?.message ?? "sin URL de Google" };

  try {
    window.localStorage.setItem(PENDING_KEY, JSON.stringify(pending));
  } catch {
    // Sin localStorage el login funciona igual: solo se pierde el next/intent.
  }
  await Browser.open({ url: data.url });
  return { error: null };
}

/** Si `url` es el regreso del login con Google, devuelve la ruta interna a la
 * que hay que navegar el WebView (el mismo /auth/callback que usa la web,
 * que canjea el código con el verificador PKCE de las cookies del WebView
 * y decide el destino según el rol); si no, null. */
export function handleNativeOAuthUrl(url: string): string | null {
  if (!url.startsWith(NATIVE_OAUTH_REDIRECT)) return null;

  try {
    if (window.sessionStorage.getItem(HANDLED_KEY) === url) return null;
    window.sessionStorage.setItem(HANDLED_KEY, url);
  } catch {
    // Sin sessionStorage no hay protección contra reprocesar el mismo enlace.
  }

  let params: URLSearchParams;
  try {
    params = new URL(url).searchParams;
  } catch {
    return "/login?error=oauth";
  }

  let pending: PendingLogin = {};
  try {
    pending = JSON.parse(window.localStorage.getItem(PENDING_KEY) ?? "{}") as PendingLogin;
    window.localStorage.removeItem(PENDING_KEY);
  } catch {
    pending = {};
  }

  const code = params.get("code");
  if (!code || params.get("error")) return "/login?error=oauth";

  const callback = new URLSearchParams({ code });
  if (pending.next) callback.set("next", pending.next);
  if (pending.intent) callback.set("intent", pending.intent);
  return `/auth/callback?${callback.toString()}`;
}
