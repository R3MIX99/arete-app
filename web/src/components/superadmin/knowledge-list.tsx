"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, FileText, Loader2, RefreshCw, Trash2, Video, Dumbbell, Apple } from "lucide-react";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import { formatDate } from "@/lib/format";
import {
  knowledgeContentTypeLabels,
  knowledgeStatusLabels,
  type KnowledgeSource,
} from "@/lib/types/knowledge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

const GOAL_LABEL: Record<string, string> = {
  lose_weight: "Perder peso",
  gain_muscle: "Ganar músculo",
  maintenance: "Mantenimiento",
  performance: "Rendimiento",
};

const TYPE_ICON = {
  document: FileText,
  video: Video,
  routine: Dumbbell,
  diet: Apple,
} as const;

const STATUS_VARIANT = {
  pending: "secondary",
  processing: "warning",
  ready: "success",
  error: "destructive",
} as const;

/** Contenido ya cargado a la base de conocimiento: su estado de
 * procesamiento, cuántos fragmentos generó, y controles para
 * desactivarlo, reprocesarlo (si quedó en error, o si se quiere
 * regenerar), o borrarlo. */
export function KnowledgeList({ sources }: { sources: KnowledgeSource[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = React.useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<KnowledgeSource | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  async function toggleActive(source: KnowledgeSource) {
    setBusyId(source.id);
    const supabase = createClient();
    const { error } = await supabase
      .from("knowledge_sources")
      .update({ is_active: !source.isActive })
      .eq("id", source.id);
    setBusyId(null);
    if (error) {
      toast.error("No se pudo actualizar.");
      return;
    }
    router.refresh();
  }

  async function reprocess(source: KnowledgeSource) {
    setBusyId(source.id);
    const supabase = createClient();
    const { error } = await supabase.functions.invoke("ingest-knowledge", {
      body: { sourceId: source.id },
    });
    setBusyId(null);
    if (error) {
      toast.error("No se pudo procesar. Revisa el mensaje de error en la tarjeta.");
      router.refresh();
      return;
    }
    toast.success("Procesado");
    router.refresh();
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const supabase = createClient();
    const { error } = await supabase.from("knowledge_sources").delete().eq("id", deleteTarget.id);
    setDeleting(false);
    if (error) {
      toast.error("No se pudo eliminar.");
      return;
    }
    toast.success("Eliminado");
    setDeleteTarget(null);
    router.refresh();
  }

  if (sources.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-2 py-12 text-center text-muted-foreground">
          <FileText className="size-7" />
          <p className="text-sm">Todavía no has cargado nada — el formulario de arriba es el punto de partida.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-2.5">
      {sources.map((source) => {
        const Icon = TYPE_ICON[source.contentType];
        return (
          <Card key={source.id}>
            <CardContent className="flex flex-col gap-2 py-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/12 text-primary">
                    <Icon className="size-[18px]" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{source.title}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      <Badge variant="secondary">{knowledgeContentTypeLabels[source.contentType]}</Badge>
                      <Badge variant={STATUS_VARIANT[source.status]}>
                        {knowledgeStatusLabels[source.status]}
                      </Badge>
                      {source.category ? (
                        <Badge variant="secondary">{GOAL_LABEL[source.category] ?? source.category}</Badge>
                      ) : null}
                      {source.status === "ready" ? (
                        <span className="text-xs text-muted-foreground">
                          {source.chunkCount} fragmento{source.chunkCount === 1 ? "" : "s"}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-1">
                  <Switch
                    checked={source.isActive}
                    disabled={busyId === source.id}
                    onCheckedChange={() => toggleActive(source)}
                    aria-label={source.isActive ? "Desactivar" : "Activar"}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="Reprocesar"
                    disabled={busyId === source.id}
                    onClick={() => reprocess(source)}
                  >
                    {busyId === source.id ? <Loader2 className="animate-spin" /> : <RefreshCw className="size-4" />}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="Eliminar"
                    className="text-destructive hover:text-destructive"
                    onClick={() => setDeleteTarget(source)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>

              {source.status === "error" && source.errorMessage ? (
                <p className="flex items-start gap-1.5 rounded-lg bg-destructive/8 px-3 py-2 text-xs text-destructive">
                  <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
                  {source.errorMessage}
                </p>
              ) : null}

              <p className="text-xs text-muted-foreground">Cargado el {formatDate(source.createdAt.slice(0, 10))}</p>
            </CardContent>
          </Card>
        );
      })}

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={`¿Eliminar "${deleteTarget?.title}"?`}
        description="Se borra también todo lo que ya haya generado (sus fragmentos) — la IA deja de usarlo como referencia. Esta acción no se puede deshacer."
        loading={deleting}
        onConfirm={handleDelete}
      />
    </div>
  );
}
