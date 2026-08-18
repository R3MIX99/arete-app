import { createClient } from "@/lib/supabase/server";
import { KnowledgeUploadForm } from "@/components/superadmin/knowledge-upload-form";
import { KnowledgeList } from "@/components/superadmin/knowledge-list";
import type { KnowledgeSource } from "@/lib/types/knowledge";

interface SourceRow {
  id: string;
  title: string;
  content_type: KnowledgeSource["contentType"];
  category: string | null;
  source_url: string | null;
  storage_path: string | null;
  raw_text: string | null;
  status: KnowledgeSource["status"];
  error_message: string | null;
  is_active: boolean;
  created_at: string;
}

export default async function SuperadminAiPage() {
  const supabase = await createClient();

  const [{ data: sourceRows }, { data: chunkRows }, { data: routineRows }, { data: dietRows }] =
    await Promise.all([
      supabase
        .from("knowledge_sources")
        .select(
          "id, title, content_type, category, source_url, storage_path, raw_text, status, error_message, is_active, created_at",
        )
        .order("created_at", { ascending: false }),
      supabase.from("knowledge_chunks").select("source_id"),
      supabase.from("routines").select("id, name").order("name"),
      supabase.from("diet_plans").select("id, name").order("name"),
    ]);

  const chunkCounts = new Map<string, number>();
  for (const row of chunkRows ?? []) {
    chunkCounts.set(row.source_id, (chunkCounts.get(row.source_id) ?? 0) + 1);
  }

  const sources: KnowledgeSource[] = ((sourceRows ?? []) as SourceRow[]).map((row) => ({
    id: row.id,
    title: row.title,
    contentType: row.content_type,
    category: row.category,
    sourceUrl: row.source_url,
    storagePath: row.storage_path,
    rawText: row.raw_text,
    status: row.status,
    errorMessage: row.error_message,
    isActive: row.is_active,
    chunkCount: chunkCounts.get(row.id) ?? 0,
    createdAt: row.created_at,
  }));

  return (
    <div className="flex w-full flex-col gap-5 p-4 md:p-8">
      <div>
        <h1 className="text-xl font-semibold">Sección IA</h1>
        <p className="text-sm text-muted-foreground">
          Contenido experto (documentos, videos, rutinas y dietas de referencia) que la IA busca
          y usa como contexto extra al generar rutinas, planes nutricionales, o evaluar una
          rutina — según el objetivo del cliente.
        </p>
      </div>

      <KnowledgeUploadForm
        routines={routineRows ?? []}
        dietPlans={dietRows ?? []}
      />

      <div>
        <h2 className="mb-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Contenido cargado
        </h2>
        <KnowledgeList sources={sources} />
      </div>
    </div>
  );
}
