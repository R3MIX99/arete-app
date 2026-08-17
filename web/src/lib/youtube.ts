const YOUTUBE_ID_REGEX = /^[a-zA-Z0-9_-]{11}$/;

/** Extrae el id del video de un enlace de YouTube (watch, youtu.be,
 * embed o shorts), o `null` si no es un enlace válido de YouTube. */
export function youtubeVideoId(url: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }

  const host = parsed.hostname.replace(/^www\./, "");

  if (host === "youtu.be") {
    const id = parsed.pathname.slice(1);
    return YOUTUBE_ID_REGEX.test(id) ? id : null;
  }

  if (host === "youtube.com" || host === "m.youtube.com") {
    if (parsed.pathname === "/watch") {
      const id = parsed.searchParams.get("v");
      return id && YOUTUBE_ID_REGEX.test(id) ? id : null;
    }
    const embedMatch = parsed.pathname.match(/^\/embed\/([a-zA-Z0-9_-]{11})/);
    if (embedMatch) return embedMatch[1];
    const shortsMatch = parsed.pathname.match(/^\/shorts\/([a-zA-Z0-9_-]{11})/);
    if (shortsMatch) return shortsMatch[1];
  }

  return null;
}

export function isYoutubeUrl(url: string): boolean {
  return youtubeVideoId(url) !== null;
}

/**
 * Miniatura del video (lo que se ve antes de darle play), para usarla
 * como imagen cuando el ejercicio o la rutina no tiene foto propia.
 *
 * - `wide`: hqdefault, 480x360. Es 4:3 con barras negras arriba y abajo
 *   si el video es 16:9, pero en una tarjeta ancha el recorte vertical
 *   se las come, y da mejor resolución.
 * - `square`: mqdefault, 320x180. Sin barras — en un recorte cuadrado
 *   las de hqdefault sí se quedarían visibles.
 *
 * Ambas existen siempre; maxresdefault no (depende de en qué calidad se
 * subió el video), por eso no se usa.
 */
export function youtubeThumbnailUrl(
  url: string | null,
  variant: "wide" | "square" = "wide",
): string | null {
  if (!url) return null;
  const id = youtubeVideoId(url);
  if (!id) return null;
  const file = variant === "square" ? "mqdefault" : "hqdefault";
  return `https://img.youtube.com/vi/${id}/${file}.jpg`;
}
