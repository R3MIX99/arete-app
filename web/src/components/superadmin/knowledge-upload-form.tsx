"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, UploadCloud } from "lucide-react";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import type { KnowledgeContentType, ReferenceOption } from "@/lib/types/knowledge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const CONTENT_TYPE_OPTIONS: { value: KnowledgeContentType; label: string }[] = [
  { value: "document", label: "Documento (PDF, Word, texto)" },
  { value: "video", label: "Video de YouTube" },
  { value: "routine", label: "Rutina existente, de referencia" },
  { value: "diet", label: "Plan nutricional existente, de referencia" },
];

const GOAL_OPTIONS = [
  { value: "lose_weight", label: "Perder peso" },
  { value: "gain_muscle", label: "Ganar músculo" },
  { value: "maintenance", label: "Mantenimiento" },
  { value: "performance", label: "Rendimiento" },
];

/**
 * Alta de una fuente para la base de conocimiento de la IA (Fase 14).
 * Según el tipo de contenido cambia qué pide el formulario:
 * - Documento: archivo (PDF/Word/texto) y, opcionalmente, el texto ya
 *   pegado — la extracción automática de PDF/Word es best-effort (un
 *   PDF escaneado como imagen no se puede leer así), pegar el texto es
 *   el camino que siempre funciona.
 * - Video: el enlace de YouTube y, opcionalmente, la transcripción
 *   pegada — la transcripción automática también es best-effort.
 * - Rutina/dieta de referencia: se elige de lo que ya existe en el
 *   catálogo de cualquier entrenador; el texto se arma solo a partir de
 *   sus datos, no hace falta pegar nada.
 *
 * Al guardar, se crea la fila en knowledge_sources y de inmediato se
 * llama a la Edge Function ingest-knowledge para partirlo en
 * fragmentos y generarles su embedding.
 */
export function KnowledgeUploadForm({
  routines,
  dietPlans,
}: {
  routines: ReferenceOption[];
  dietPlans: ReferenceOption[];
}) {
  const router = useRouter();
  const [contentType, setContentType] = React.useState<KnowledgeContentType>("document");
  const [title, setTitle] = React.useState("");
  const [category, setCategory] = React.useState<string>("general");
  const [sourceUrl, setSourceUrl] = React.useState("");
  const [rawText, setRawText] = React.useState("");
  const [referenceId, setReferenceId] = React.useState("");
  const [file, setFile] = React.useState<File | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  function resetForm() {
    setTitle("");
    setSourceUrl("");
    setRawText("");
    setReferenceId("");
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (contentType === "routine" && !referenceId) {
      setError("Elige qué rutina quieres marcar como referencia.");
      return;
    }
    if (contentType === "diet" && !referenceId) {
      setError("Elige qué plan nutricional quieres marcar como referencia.");
      return;
    }
    if (contentType === "video" && !sourceUrl.trim()) {
      setError("Pega el enlace del video de YouTube.");
      return;
    }
    if (contentType === "document" && !file && !rawText.trim()) {
      setError("Sube un archivo o pega el texto del documento.");
      return;
    }

    setSaving(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setSaving(false);
      setError("Tu sesión expiró — recarga la página.");
      return;
    }

    let storagePath: string | null = null;
    if (contentType === "document" && file) {
      storagePath = `${crypto.randomUUID()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("knowledge-documents")
        .upload(storagePath, file, { upsert: false });
      if (uploadError) {
        setSaving(false);
        setError("No se pudo subir el archivo.");
        return;
      }
    }

    const referenceName =
      contentType === "routine"
        ? routines.find((r) => r.id === referenceId)?.name
        : contentType === "diet"
          ? dietPlans.find((d) => d.id === referenceId)?.name
          : null;

    const { data: source, error: insertError } = await supabase
      .from("knowledge_sources")
      .insert({
        title: title.trim() || referenceName || file?.name || sourceUrl.trim() || "Sin título",
        content_type: contentType,
        category: category === "general" ? null : category,
        source_url: contentType === "video" ? sourceUrl.trim() : null,
        storage_path: storagePath,
        raw_text: rawText.trim() || null,
        source_routine_id: contentType === "routine" ? referenceId : null,
        source_diet_plan_id: contentType === "diet" ? referenceId : null,
        created_by: user.id,
      })
      .select("id")
      .single();

    if (insertError || !source) {
      setSaving(false);
      setError("No se pudo crear la fuente. Intenta de nuevo.");
      return;
    }

    const { error: ingestError } = await supabase.functions.invoke("ingest-knowledge", {
      body: { sourceId: source.id },
    });
    setSaving(false);

    if (ingestError) {
      toast.error("Se guardó, pero no se pudo procesar todavía", {
        description: "Revisa el estado en la lista — puedes reprocesarlo desde ahí.",
      });
    } else {
      toast.success("Contenido procesado y disponible para la IA");
    }

    resetForm();
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Agregar contenido</CardTitle>
        <CardDescription>
          La IA lo usa como referencia extra al generar rutinas, dietas, o evaluar una rutina —
          según a qué objetivo lo asocies.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label>Tipo de contenido</Label>
              <Select value={contentType} onValueChange={(v) => setContentType(v as KnowledgeContentType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CONTENT_TYPE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Objetivo al que aplica</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General (cualquier objetivo)</SelectItem>
                  {GOAL_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {contentType === "routine" ? (
            <div className="flex flex-col gap-1.5">
              <Label>Rutina a marcar como referencia</Label>
              <Select value={referenceId} onValueChange={setReferenceId}>
                <SelectTrigger>
                  <SelectValue placeholder="Elige una rutina" />
                </SelectTrigger>
                <SelectContent>
                  {routines.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : contentType === "diet" ? (
            <div className="flex flex-col gap-1.5">
              <Label>Plan nutricional a marcar como referencia</Label>
              <Select value={referenceId} onValueChange={setReferenceId}>
                <SelectTrigger>
                  <SelectValue placeholder="Elige un plan" />
                </SelectTrigger>
                <SelectContent>
                  {dietPlans.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="title">Título</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={
                    contentType === "video" ? "Ej. Técnica de sentadilla — Canal X" : "Ej. Guía de periodización de fuerza"
                  }
                />
              </div>

              {contentType === "video" && (
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="source_url">Enlace de YouTube</Label>
                  <Input
                    id="source_url"
                    value={sourceUrl}
                    onChange={(e) => setSourceUrl(e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=..."
                  />
                </div>
              )}

              {contentType === "document" && (
                <div className="flex flex-col gap-1.5">
                  <Label>Archivo (PDF, Word o texto)</Label>
                  <div className="flex items-center gap-3">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.doc,.docx,.txt,.md"
                      className="hidden"
                      onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <UploadCloud /> {file ? "Cambiar archivo" : "Elegir archivo"}
                    </Button>
                    {file ? <span className="truncate text-sm text-muted-foreground">{file.name}</span> : null}
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="raw_text">
                  {contentType === "video" ? "Transcripción (opcional)" : "Contenido (opcional si subiste archivo)"}
                </Label>
                <Textarea
                  id="raw_text"
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  rows={5}
                  placeholder={
                    contentType === "video"
                      ? "Se intenta sacar sola si el video tiene subtítulos — si no, pégala aquí."
                      : "Se intenta leer el archivo solo — si es un PDF escaneado como imagen y falla, pega el texto aquí."
                  }
                />
              </div>
            </>
          )}

          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}

          <Button type="submit" disabled={saving} className="mt-1 w-fit">
            {saving ? <Loader2 className="animate-spin" /> : null}
            Agregar y procesar
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
