import type { AuthError, User } from "@supabase/supabase-js";

/**
 * Detecta si un `supabase.auth.signUp()` fue en realidad un intento de
 * registrarse con un correo que ya tiene cuenta.
 *
 * Hay dos formas en que esto llega, y hay que cubrir ambas:
 * - Un error explícito ("User already registered").
 * - Supabase, para no delatar qué correos existen, a veces responde
 *   "éxito" con un `user` cuyo `identities` viene vacío — esa es la
 *   señal silenciosa de "ya existe una cuenta con este correo", y si no
 *   se revisa, el formulario diría "cuenta creada" sin haber creado
 *   nada.
 */
export function isAlreadyRegisteredSignUp(
  error: AuthError | null,
  user: User | null | undefined,
): boolean {
  if (error?.message.toLowerCase().includes("registered")) return true;
  if (user && Array.isArray(user.identities) && user.identities.length === 0) return true;
  return false;
}
