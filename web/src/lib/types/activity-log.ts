export type ActivityLogSeverity = "info" | "success" | "warning" | "error" | "critical";

export type ActivityLogCategory = "auth" | "trainer" | "client" | "superadmin" | "system";

export type ActivityLogActorRole = "client" | "trainer" | "superadmin" | "anon";

export interface ActivityLogRow {
  id: string;
  created_at: string;
  actor_id: string | null;
  actor_role: ActivityLogActorRole;
  actor_name: string | null;
  actor_email: string | null;
  action: string;
  category: ActivityLogCategory;
  severity: ActivityLogSeverity;
  message: string;
  target_type: string | null;
  target_id: string | null;
  target_label: string | null;
  context: Record<string, unknown>;
}
