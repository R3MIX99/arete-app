export type KnowledgeContentType = "document" | "video" | "routine" | "diet";
export type KnowledgeStatus = "pending" | "processing" | "ready" | "error";

export const knowledgeContentTypeLabels: Record<KnowledgeContentType, string> = {
  document: "Documento",
  video: "Video",
  routine: "Rutina de referencia",
  diet: "Dieta de referencia",
};

export const knowledgeStatusLabels: Record<KnowledgeStatus, string> = {
  pending: "Pendiente",
  processing: "Procesando",
  ready: "Listo",
  error: "Error",
};

export interface KnowledgeSource {
  id: string;
  title: string;
  contentType: KnowledgeContentType;
  category: string | null;
  sourceUrl: string | null;
  storagePath: string | null;
  rawText: string | null;
  status: KnowledgeStatus;
  errorMessage: string | null;
  isActive: boolean;
  chunkCount: number;
  createdAt: string;
}

/** Rutinas/dietas del catálogo, para el selector de "marcar como
 * referencia" — no hace falta más que el nombre y el id. */
export interface ReferenceOption {
  id: string;
  name: string;
}
