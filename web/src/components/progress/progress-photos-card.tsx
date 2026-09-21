"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Camera, ImagePlus } from "lucide-react";
import { toast } from "sonner";

import { HomeSectionTitle } from "@/components/client/home-section-title";
import { ProgressPhotoEditor } from "@/components/progress/progress-photo-editor";

const MAX_FILE_BYTES = 40 * 1024 * 1024;

/** Tarjeta del inicio del cliente: solo para tomar o elegir una foto nueva.
 * Las fotos ya subidas se ven en el historial, no aquí. */
export function ProgressPhotosCard({
  clientId,
  trainerId,
}: {
  clientId: string;
  trainerId: string;
}) {
  const router = useRouter();
  const [file, setFile] = React.useState<File | null>(null);
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

  const boxClass =
    "flex h-24 w-[118px] flex-col items-center justify-center gap-2.5 rounded-2xl border bg-card px-2 text-center text-xs font-medium transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none";

  return (
    <section className="flex flex-col gap-4">
      <HomeSectionTitle>Foto de progreso</HomeSectionTitle>
      <p className="text-xs leading-relaxed text-muted-foreground">
        Sube una foto para comparar tu avance con el tiempo. Solo tú y tu entrenador pueden verlas.
      </p>

      <div className="flex gap-3">
        <button type="button" onClick={() => cameraInput.current?.click()} className={boxClass}>
          <Camera className="size-5" />
          Tomar foto
        </button>
        <button type="button" onClick={() => galleryInput.current?.click()} className={boxClass}>
          <ImagePlus className="size-5" />
          Elegir en galería
        </button>
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
    </section>
  );
}
