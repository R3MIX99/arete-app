"use client";

import * as React from "react";
import { Loader2, RotateCw } from "lucide-react";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import {
  clampPan,
  DEFAULT_ADJUST,
  drawSquare,
  loadWorkingImage,
  MAX_ZOOM,
  MIN_ZOOM,
  renderSquareBlob,
  uploadProgressPhoto,
  type PhotoAdjust,
} from "@/lib/progress-photos";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Slider } from "@/components/ui/slider";

const PREVIEW_SIZE = 720;

/** Drawer que aparece al tomar o elegir una foto: muestra la vista previa
 * cuadrada (1:1, tal como se guardará) y deja elegir entre editarla
 * (mover, acercar, rotar) o confirmarla. */
export function ProgressPhotoEditor({
  file,
  clientId,
  trainerId,
  onClose,
  onSaved,
}: {
  file: File | null;
  clientId: string;
  trainerId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [source, setSource] = React.useState<HTMLCanvasElement | null>(null);
  const [adjust, setAdjust] = React.useState<PhotoAdjust>(DEFAULT_ADJUST);
  const [editing, setEditing] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  // `saving` es estado y se actualiza tarde: un doble toque rápido alcanzaría
  // a lanzar dos subidas. Este cerrojo sí es inmediato.
  const submitting = React.useRef(false);
  const drag = React.useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);

  // Cada archivo nuevo empieza de cero (se ajusta durante el render, no en
  // un efecto, para no provocar un segundo render).
  const [prevFile, setPrevFile] = React.useState(file);
  if (file !== prevFile) {
    setPrevFile(file);
    setSource(null);
    setAdjust(DEFAULT_ADJUST);
    setEditing(false);
  }

  React.useEffect(() => {
    if (!file) return;
    let cancelled = false;
    loadWorkingImage(file)
      .then((canvas) => {
        if (!cancelled) setSource(canvas);
      })
      .catch(() => {
        if (cancelled) return;
        toast.error("No pudimos abrir esa imagen. Prueba con otra foto.");
        onClose();
      });
    return () => {
      cancelled = true;
    };
    // onClose cambia en cada render del padre; solo importa el archivo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file]);

  React.useEffect(() => {
    if (source && canvasRef.current) drawSquare(canvasRef.current, source, PREVIEW_SIZE, adjust);
  }, [source, adjust, editing]);

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (!editing) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { x: event.clientX, y: event.clientY, panX: adjust.panX, panY: adjust.panY };
  }

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const start = drag.current;
    if (!start || !source) return;
    const side = event.currentTarget.getBoundingClientRect().width;
    setAdjust(
      clampPan(source, {
        ...adjust,
        panX: start.panX + (event.clientX - start.x) / side,
        panY: start.panY + (event.clientY - start.y) / side,
      }),
    );
  }

  function handlePointerUp() {
    drag.current = null;
  }

  function handleZoom(value: number) {
    if (!source) return;
    setAdjust(clampPan(source, { ...adjust, zoom: value }));
  }

  function handleRotate() {
    // Al girar cambian las proporciones, así que se recentra.
    setAdjust({ ...adjust, rotation: (adjust.rotation + 1) % 4, panX: 0, panY: 0 });
  }

  async function handleConfirm() {
    if (!source || submitting.current) return;
    submitting.current = true;
    setSaving(true);
    try {
      const blob = await renderSquareBlob(source, adjust);
      const { error, duplicate } = await uploadProgressPhoto(createClient(), {
        clientId,
        trainerId,
        blob,
      });
      if (error) {
        toast.error("No se pudo guardar la foto. Inténtalo de nuevo.");
        return;
      }
      toast.success(duplicate ? "Esa foto ya estaba guardada" : "Foto guardada");
      onSaved();
    } catch {
      toast.error("No se pudo guardar la foto. Inténtalo de nuevo.");
    } finally {
      submitting.current = false;
      setSaving(false);
    }
  }

  return (
    <Drawer open={file !== null} onOpenChange={(open) => !open && !saving && onClose()}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>{editing ? "Editar foto" : "Nueva foto de progreso"}</DrawerTitle>
          <DrawerDescription>
            {editing
              ? "Arrastra la foto para moverla y usa el control para acercarla."
              : "Así se verá tu foto. Puedes ajustarla o confirmarla."}
          </DrawerDescription>
        </DrawerHeader>

        <div className="flex flex-col gap-4 overflow-y-auto px-4 pb-6">
          {/* data-vaul-no-drag: sin esto, arrastrar la foto cierra el drawer. */}
          <div
            data-vaul-no-drag
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            className={`relative mx-auto aspect-square w-full max-w-[22rem] overflow-hidden rounded-xl bg-foreground/[0.05] ${
              editing ? "cursor-grab touch-none ring-2 ring-primary active:cursor-grabbing" : ""
            }`}
          >
            {source ? (
              <canvas ref={canvasRef} className="size-full" aria-label="Vista previa de la foto" />
            ) : (
              <div className="flex size-full items-center justify-center">
                <Loader2 className="size-6 animate-spin text-muted-foreground" />
              </div>
            )}
          </div>

          {editing ? (
            <div className="mx-auto flex w-full max-w-[22rem] flex-col gap-4">
              <div data-vaul-no-drag className="flex items-center gap-3">
                <span className="w-16 shrink-0 text-sm text-muted-foreground">Acercar</span>
                <Slider
                  min={MIN_ZOOM}
                  max={MAX_ZOOM}
                  step={0.01}
                  value={[adjust.zoom]}
                  onValueChange={([value]) => handleZoom(value)}
                  aria-label="Acercar"
                />
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" className="flex-1" onClick={handleRotate}>
                  <RotateCw /> Rotar
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setAdjust(DEFAULT_ADJUST)}
                >
                  Restablecer
                </Button>
              </div>
              <Button type="button" onClick={() => setEditing(false)}>
                Listo
              </Button>
            </div>
          ) : (
            <div className="mx-auto flex w-full max-w-[22rem] flex-col gap-2">
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  disabled={!source || saving}
                  onClick={() => setEditing(true)}
                >
                  Editar
                </Button>
                <Button
                  type="button"
                  className="flex-1"
                  disabled={!source || saving}
                  onClick={() => void handleConfirm()}
                >
                  {saving ? <Loader2 className="animate-spin" /> : null}
                  Confirmar
                </Button>
              </div>
              <Button type="button" variant="ghost" disabled={saving} onClick={onClose}>
                Cancelar
              </Button>
            </div>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
