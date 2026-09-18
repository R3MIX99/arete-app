import type { SupabaseClient } from "@supabase/supabase-js";

const PERSONAL_FILE_BUCKETS = ["progress-photos", "business-logos"] as const;

/** Elimina la cuenta del usuario que tiene la sesión abierta.
 *
 * Orden importante: primero se listan sus archivos personales, luego se
 * llama a la función de la base (que puede negarse, p. ej. si administra un
 * gimnasio) y solo después se borran los archivos — así, si el borrado se
 * rechaza, no se pierde nada. El JWT sigue siendo válido unos minutos aunque
 * el usuario de auth ya no exista, por eso los archivos aún se pueden quitar.
 */
export async function deleteMyAccount(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>,
  userId: string,
): Promise<{ error: string | null }> {
  const filesToRemove: { bucket: string; paths: string[] }[] = [];
  for (const bucket of PERSONAL_FILE_BUCKETS) {
    const { data } = await supabase.storage.from(bucket).list(userId, { limit: 1000 });
    const paths = (data ?? []).filter((f) => f.name).map((f) => `${userId}/${f.name}`);
    if (paths.length > 0) filesToRemove.push({ bucket, paths });
  }

  const { error } = await supabase.rpc("delete_my_account");
  if (error) return { error: error.message };

  for (const { bucket, paths } of filesToRemove) {
    await supabase.storage.from(bucket).remove(paths);
  }

  await supabase.auth.signOut();
  return { error: null };
}
