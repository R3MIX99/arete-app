"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Camera, ImagePlus } from "lucide-react";
import { toast } from "sonner";

import type { ProgressPhotoEntry } from "@/lib/types/progress";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ProgressPhotoEditor } from "@/components/progress/progress-photo-editor";
import { ProgressPhotoGallery } from "@/components/progress/progress-photo-gallery";

const VISIBLE_WHEN_COLLAPSED = 6;
const MAX_FILE_BYTES = 40 * 1024 * 1024;

/** Tarjeta del inicio del cliente: tomar (o elegir) una foto de progreso y
 * ver las que ya subió. */
export function ProgressPhotosCard({
  clientId,
  trainerId,
  photos,
}: {
  clientId: string;
  trainerId: string;
  /** De la más reciente a la más antigua. */
  photos: ProgressPhotoEntry[];
}) {
  const router = useRouter();
  const [file, setFile] = React.useState<File | null>(null);
  const [showAll, setShowAll] = React.useState(false);
  const cameraInput = React.useRef<HTMLInputElement>(null);
  const galleryInput = React.useRef<HTMLInputElement>(null);

  function handlePicked(event: React.ChangeEvent<HTMLInputElement>) {
    const picked = event.target.files?.[0];
    // Se limpia para poder elegir el mismo archivo otra vez.
    event.target.value = "";
    if (!picked) return;
    if (!picked.type.startsWith("image/")) {
      toast.error("Elige una imagen.");
      return;
    }
    if (picked.size > MAX_FILE_BYTES) {
      toast.error("La imagen es demasiado grande.");
      return;
    }
    setFile(picked);
  }

  const visible = showAll ? photos : photos.slice(0, VISIBLE_WHEN_COLLAPSED);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Fotos de progreso</CardTitle>
        <CardDescription>
          Compara tu avance con el tiempo. Solo tú y tu entrenador pueden verlas.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex gap-2">
          <Button type="button" className="flex-1" onClick={() => cameraInput.current?.click()}>
            <Camera /> Tomar foto
          </Button>
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={() => galleryInput.current?.click()}
          >
            <ImagePlus /> Elegir de la galería
          </Button>
        </div>

        <input
          ref={cameraInput}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handlePicked}
        />
        <input
          ref={galleryInput}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handlePicked}
        />

        {photos.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Aún no tienes fotos. Toma la primera para poder comparar tu avance más adelante.
          </p>
        ) : (
          <>
            <ProgressPhotoGallery photos={visible} />
            {photos.length > VISIBLE_WHEN_COLLAPSED ? (
              <Button
                type="button"
                variant="ghost"
                className="self-center"
                onClick={() => setShowAll((value) => !value)}
              >
                {showAll ? "Ver menos" : `Ver todas (${photos.length})`}
              </Button>
            ) : null}
          </>
        )}
      </CardContent>

      <ProgressPhotoEditor
        file={file}
        clientId={clientId}
        trainerId={trainerId}
        onClose={() => setFile(null)}
        onSaved={() => {
          setFile(null);
          router.refresh();
        }}
      />
    </Card>
  );
}
