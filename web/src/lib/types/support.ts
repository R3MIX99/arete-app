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
  ticket_number: number;
  last_message_at: string;
  trainer_unread: number;
  admin_unread: number;
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

export interface SupportMessage {
  id: string;
  ticket_id: string;
  author_id: string | null;
  author_role: "trainer" | "support";
  body: string;
  created_at: string;
}

export const SUPPORT_TICKET_COLUMNS =
  "id, ticket_number, created_at, last_message_at, user_id, name, email, category, subject, message, status, admin_note, resolved_at, trainer_unread, admin_unread";
