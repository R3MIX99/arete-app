import { createClient } from "@/lib/supabase/server";
import { ActivityLogsBrowser } from "@/components/superadmin/activity-logs-browser";
import type { ActivityLogRow } from "@/lib/types/activity-log";

/**
 * Últimos 1000 eventos — de sobra para filtrar/ordenar del lado del
 * cliente (mismo patrón que el resto del panel de superadmin, ver
 * PeopleTable). Si el volumen crece mucho, el siguiente paso natural es
 * mover los filtros a la consulta (paginación real) en vez de bajar
 * todo de una — no hace falta todavía.
 */
export default async function SuperadminLogsPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("activity_logs")
    .select(
      "id, created_at, actor_id, actor_role, actor_name, actor_email, action, category, severity, message, target_type, target_id, target_label, context",
    )
    .order("created_at", { ascending: false })
    .limit(1000);

  return (
    <div className="flex w-full flex-col gap-5 p-4 pb-10 md:p-8">
      <div>
        <h1 className="text-xl font-semibold">Logs</h1>
        <p className="text-sm text-muted-foreground">
          Actividad de toda la plataforma: quién hizo qué, cuándo, y qué tan grave fue.
        </p>
      </div>
      <ActivityLogsBrowser logs={(data ?? []) as ActivityLogRow[]} />
    </div>
  );
}
