import type { SupabaseClient } from "@supabase/supabase-js";

export const PROGRESS_PHOTO_BUCKET = "progress-photos";

/** Peso objetivo de la foto guardada. Se baja la calidad (y, si hace falta,
 * el tamaño) hasta quedar por debajo; la original nunca se sube. */
const TARGET_BYTES = 100 * 1024;
/** Lados (px) a probar, de mayor a menor. Cuadrada: se ve igual en miniatura
 * y ampliada. */
const OUTPUT_SIZES = [900, 720, 600];
const JPEG_QUALITIES = [0.8, 0.7, 0.6, 0.5, 0.4];
/** Lado máximo (px) de la imagen de trabajo del editor. Una foto de cámara
 * ronda los 4000 px; redibujarla completa en cada movimiento sería lento. */
const WORKING_MAX = 2048;

export const MIN_ZOOM = 1;
export const MAX_ZOOM = 3;

export interface PhotoAdjust {
  zoom: number;
  /** Desplazamiento como fracción del lado del cuadro (0 = centrada). */
  panX: number;
  panY: number;
  /** Giro en pasos de 90 grados en sentido horario (0 a 3). */
  rotation: number;
}

export const DEFAULT_ADJUST: PhotoAdjust = { zoom: 1, panX: 0, panY: 0, rotation: 0 };

/** Lee el archivo respetando la orientación EXIF (las fotos de celular
 * suelen venir "de lado" y rotadas por metadatos) y lo reduce si es muy
 * grande. */
export async function loadWorkingImage(file: File): Promise<HTMLCanvasElement> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const scale = Math.min(1, WORKING_MAX / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas");
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas;
}

function rotatedSize(source: HTMLCanvasElement, rotation: number) {
  const odd = rotation % 2 === 1;
  return { w: odd ? source.height : source.width, h: odd ? source.width : source.height };
}

/** Cuánto se puede desplazar la imagen (fracción del lado) sin dejar
 * huecos en el cuadro. */
export function panLimits(source: HTMLCanvasElement, adjust: PhotoAdjust) {
  const { w, h } = rotatedSize(source, adjust.rotation);
  const scale = (1 / Math.min(w, h)) * adjust.zoom; // lado del cuadro = 1
  return {
    x: Math.max(0, (w * scale - 1) / 2),
    y: Math.max(0, (h * scale - 1) / 2),
  };
}

export function clampPan(source: HTMLCanvasElement, adjust: PhotoAdjust): PhotoAdjust {
  const limits = panLimits(source, adjust);
  return {
    ...adjust,
    panX: Math.min(limits.x, Math.max(-limits.x, adjust.panX)),
    panY: Math.min(limits.y, Math.max(-limits.y, adjust.panY)),
  };
}

/** Dibuja la imagen recortada en un cuadrado de `size` px. */
export function drawSquare(
  canvas: HTMLCanvasElement,
  source: HTMLCanvasElement,
  size: number,
  adjust: PhotoAdjust,
) {
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const safe = clampPan(source, adjust);
  const { w, h } = rotatedSize(source, safe.rotation);
  const scale = (size / Math.min(w, h)) * safe.zoom;

  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, size, size);
  ctx.save();
  ctx.translate(size / 2 + safe.panX * size, size / 2 + safe.panY * size);
  ctx.rotate((safe.rotation * Math.PI) / 2);
  ctx.scale(scale, scale);
  ctx.drawImage(source, -source.width / 2, -source.height / 2);
  ctx.restore();
}

function canvasToJpeg(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("blob"))),
      "image/jpeg",
      quality,
    );
  });
}

/** Recorta la imagen a un cuadrado y la comprime al máximo: prueba calidades
 * de mayor a menor y, si aun así pesa más que el objetivo, reduce el
 * tamaño. Si nada alcanza, devuelve la versión más pequeña. */
export async function renderSquareBlob(
  source: HTMLCanvasElement,
  adjust: PhotoAdjust,
): Promise<Blob> {
  const canvas = document.createElement("canvas");
  let smallest: Blob | null = null;
  for (const size of OUTPUT_SIZES) {
    drawSquare(canvas, source, size, adjust);
    for (const quality of JPEG_QUALITIES) {
      const blob = await canvasToJpeg(canvas, quality);
      if (!smallest || blob.size < smallest.size) smallest = blob;
      if (blob.size <= TARGET_BYTES) return blob;
    }
  }
  return smallest as Blob;
}

/** Huella SHA-256 del contenido; sirve de nombre de archivo, así la misma
 * foto siempre cae en la misma ruta y no se puede subir dos veces. */
async function contentHash(blob: Blob): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", await blob.arrayBuffer());
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

/** Fecha local de hoy (YYYY-MM-DD). No se usa toISOString porque es UTC y
 * de noche marcaría el día siguiente. */
function localDateKey(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** Sube la foto a la carpeta del cliente y crea su entrada. La ruta sale del
 * contenido, por lo que una foto idéntica no se duplica: si ya existe, se
 * avisa con `duplicate`. Si la entrada falla se quita el archivo recién
 * subido, para no dejar fotos huérfanas. */
export async function uploadProgressPhoto(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>,
  { clientId, trainerId, blob }: { clientId: string; trainerId: string; blob: Blob },
): Promise<{ error: string | null; duplicate?: boolean }> {
  const path = `${clientId}/${await contentHash(blob)}.jpg`;
  const { error: uploadError } = await supabase.storage
    .from(PROGRESS_PHOTO_BUCKET)
    .upload(path, blob, { contentType: "image/jpeg", upsert: false });

  let uploadedNow = true;
  if (uploadError) {
    const alreadyThere = /already exists|duplicate/i.test(uploadError.message);
    if (!alreadyThere) return { error: uploadError.message };
    uploadedNow = false;
    // El archivo existe: si también tiene su entrada, es un duplicado real.
    // Si no (un borrado anterior quedó a medias), se reutiliza el archivo.
    const { data: existing } = await supabase
      .from("progress_entries")
      .select("id")
      .eq("client_id", clientId)
      .eq("photo_path", path)
      .limit(1);
    if (existing && existing.length > 0) return { error: null, duplicate: true };
  }

  const { error: insertError } = await supabase.from("progress_entries").insert({
    client_id: clientId,
    trainer_id: trainerId,
    entry_date: localDateKey(),
    photo_path: path,
  });
  if (insertError) {
    if (uploadedNow) await supabase.storage.from(PROGRESS_PHOTO_BUCKET).remove([path]);
    return { error: insertError.message };
  }
  return { error: null };
}

/** Elimina la foto para todos: primero la entrada (si falla, no se pierde
 * nada) y después el archivo. */
export async function deleteProgressPhoto(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>,
  { entryId, photoPath }: { entryId: string; photoPath: string },
): Promise<{ error: string | null }> {
  const { data, error } = await supabase
    .from("progress_entries")
    .delete()
    .eq("id", entryId)
    .select("id");
  if (error) return { error: error.message };
  if (!data || data.length === 0) return { error: "No tienes permiso para eliminar esta foto." };

  await supabase.storage.from(PROGRESS_PHOTO_BUCKET).remove([photoPath]);
  return { error: null };
}
