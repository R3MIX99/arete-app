/**
 * Comprime una imagen en el navegador antes de subirla — la
 * redimensiona a un ancho/alto máximo y la reencoda como JPEG, para
 * que las fotos de alimentos/platillos no ocupen espacio de más en el
 * bucket ni tarden en cargar en el catálogo. Las tarjetas y el detalle
 * las muestran en miniatura (nunca más de ~300px reales en pantalla),
 * así que se puede comprimir agresivo sin que se note la pérdida de
 * calidad.
 *
 * El JPEG no tiene transparencia: lo transparente se vuelve negro. Para
 * logos, que suelen ser PNG sin fondo, se pide `format: "png"`, que la
 * conserva.
 */
export async function compressImage(
  file: File,
  {
    maxDimension = 480,
    quality = 0.6,
    format = "jpeg",
  }: { maxDimension?: number; quality?: number; format?: "jpeg" | "png" } = {},
): Promise<File> {
  if (!file.type.startsWith("image/")) return file;

  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.drawImage(bitmap, 0, 0, width, height);

  const mime = format === "png" ? "image/png" : "image/jpeg";
  const blob: Blob | null = await new Promise((resolve) =>
    canvas.toBlob(resolve, mime, quality),
  );
  if (!blob) return file;

  const newName = file.name.replace(/\.[^.]+$/, "") + (format === "png" ? ".png" : ".jpg");
  return new File([blob], newName, { type: mime });
}
