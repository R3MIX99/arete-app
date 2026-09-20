"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, ImageOff, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import { formatDate } from "@/lib/format";
import { deleteProgressPhoto, PROGRESS_PHOTO_BUCKET } from "@/lib/progress-photos";
import type { ProgressPhotoEntry } from "@/lib/types/progress";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";

const SIGNED_URL_SECONDS = 3600;

/** Miniaturas de las fotos de progreso; al tocar una se abre ampliada con
 * la opción de eliminarla. La usan tanto el cliente como su entrenador: la
 * foto se elimina para los dos. */
export function ProgressPhotoGallery({
  photos,
  canDelete = true,
  viewer = "client",
}: {
  /** De la más reciente a la más antigua. */
  photos: ProgressPhotoEntry[];
  canDelete?: boolean;
  /** Quién la mira; solo cambia el texto de la confirmación. */
  viewer?: "client" | "trainer";
}) {
  const router = useRouter();
  const supabase = React.useMemo(() => createClient(), []);
  const [urls, setUrls] = React.useState<Record<string, string>>({});
  const [failed, setFailed] = React.useState<Set<string>>(new Set());
  const [openIndex, setOpenIndex] = React.useState<number | null>(null);
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);

  // Una sola petición para todas las fotos (en vez de una por miniatura).
  const paths = React.useMemo(
    () => photos.map((p) => p.photo_path).filter((p): p is string => Boolean(p)),
    [photos],
  );
  React.useEffect(() => {
    if (paths.length === 0) return;
    let cancelled = false;
    void (async () => {
      const { data, error } = await supabase.storage
        .from(PROGRESS_PHOTO_BUCKET)
        .createSignedUrls(paths, SIGNED_URL_SECONDS);
      if (cancelled) return;
      if (error || !data) {
        setFailed(new Set(paths));
        return;
      }
      const next: Record<string, string> = {};
      const bad = new Set<string>();
      for (const item of data) {
        if (item.path && item.signedUrl) next[item.path] = item.signedUrl;
        else if (item.path) bad.add(item.path);
      }
      setUrls(next);
      setFailed(bad);
    })();
    return () => {
      cancelled = true;
    };
  }, [paths, supabase]);

  // Si la lista se acorta (p. ej. tras eliminar) no se queda apuntando a una
  // posición que ya no existe.
  const activeIndex =
    openIndex === null || photos.length === 0 ? null : Math.min(openIndex, photos.length - 1);
  const current = activeIndex === null ? null : photos[activeIndex];

  async function handleDelete() {
    if (!current?.photo_path) return;
    setDeleting(true);
    const { error } = await deleteProgressPhoto(supabase, {
      entryId: current.id,
      photoPath: current.photo_path,
    });
    setDeleting(false);
    if (error) {
      toast.error(error);
      return;
    }
    setConfirmOpen(false);
    setOpenIndex(null);
    toast.success("Foto eliminada");
    router.refresh();
  }

  function renderImage(photo: ProgressPhotoEntry, className: string) {
    const path = photo.photo_path;
    const url = path ? urls[path] : undefined;
    if (path && failed.has(path)) {
      return <ImageOff className="size-5 text-muted-foreground" />;
    }
    if (!url) return <Loader2 className="size-4 animate-spin text-muted-foreground" />;
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt={`Foto de progreso del ${formatDate(photo.entry_date)}`} className={className} />;
  }

  if (photos.length === 0) return null;

  return (
    <>
      <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
        {photos.map((photo, index) => (
          <li key={photo.id}>
            <button
              type="button"
              onClick={() => setOpenIndex(index)}
              className="group flex w-full flex-col gap-1 text-left"
              aria-label={`Ampliar foto del ${formatDate(photo.entry_date)}`}
            >
              <span className="flex aspect-square w-full items-center justify-center overflow-hidden rounded-lg bg-foreground/[0.05]">
                {renderImage(photo, "size-full object-cover transition-transform group-hover:scale-105")}
              </span>
              <span className="text-[11px] text-muted-foreground">{formatDate(photo.entry_date)}</span>
            </button>
          </li>
        ))}
      </ul>

      <Dialog open={current !== null} onOpenChange={(open) => !open && setOpenIndex(null)}>
        <DialogContent className="max-w-md gap-3 p-4">
          <DialogTitle className="pr-6 text-base">
            {current ? formatDate(current.entry_date) : "Foto de progreso"}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Foto de progreso ampliada. Puedes moverte entre fotos o eliminarla.
          </DialogDescription>

          {current ? (
            <div className="flex aspect-square w-full items-center justify-center overflow-hidden rounded-lg bg-foreground/[0.05]">
              {renderImage(current, "size-full object-contain")}
            </div>
          ) : null}

          <div className="flex items-center justify-between gap-2">
            <div className="flex gap-1">
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label="Foto más reciente"
                disabled={activeIndex === null || activeIndex === 0}
                onClick={() => setOpenIndex((i) => (i === null ? i : i - 1))}
              >
                <ChevronLeft />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label="Foto más antigua"
                disabled={activeIndex === null || activeIndex >= photos.length - 1}
                onClick={() => setOpenIndex((i) => (i === null ? i : i + 1))}
              >
                <ChevronRight />
              </Button>
            </div>
            {canDelete ? (
              <Button type="button" variant="outline" onClick={() => setConfirmOpen(true)}>
                <Trash2 /> Eliminar
              </Button>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Eliminar foto"
        description={
          viewer === "trainer"
            ? "La foto se eliminará también de la cuenta del cliente. Esta acción no se puede deshacer."
            : "La foto se eliminará para ti y para tu entrenador. Esta acción no se puede deshacer."
        }
        loading={deleting}
        onConfirm={() => void handleDelete()}
      />
    </>
  );
}
