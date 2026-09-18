export type SupportCategory =
  | "cuenta"
  | "eliminar_cuenta"
  | "pagos"
  | "error"
  | "sugerencia"
  | "otro";

export type SupportStatus = "open" | "in_progress" | "resolved";

export const supportCategoryLabels: Record<SupportCategory, string> = {
  cuenta: "Problemas con mi cuenta",
  eliminar_cuenta: "Eliminar mi cuenta",
  pagos: "Pagos y planes",
  error: "Reportar un error",
  sugerencia: "Sugerencia",
  otro: "Otro",
};

export const supportStatusLabels: Record<SupportStatus, string> = {
  open: "Abierto",
  in_progress: "En proceso",
  resolved: "Resuelto",
};

export interface SupportTicket {
  id: string;
  created_at: string;
  user_id: string | null;
  name: string;
  email: string;
  category: SupportCategory;
  subject: string;
  message: string;
  status: SupportStatus;
  admin_note: string | null;
  resolved_at: string | null;
}
