import { createBrowserClient } from "@supabase/ssr";

/**
 * Cliente de Supabase para componentes de cliente ("use client"). El
 * acceso real a los datos lo controla RLS en la base — la clave anónima
 * es segura de exponer aquí.
 *
 * Se guarda como singleton a propósito: crear un `createBrowserClient`
 * nuevo en cada llamada crea también un GoTrueClient nuevo cada vez, y
 * varias instancias compitiendo por el mismo lock de refresco de sesión
 * (Web Locks API) es justo lo que hacía que guardar cambios se quedara
 * trabado para siempre sin ni siquiera mandar la petición de red.
 */
let browserClient: ReturnType<typeof createBrowserClient> | undefined;

export function createClient() {
  if (!browserClient) {
    browserClient = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
  }
  return browserClient;
}
