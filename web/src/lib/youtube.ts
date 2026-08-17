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
 * Se usa `frame0` y no las miniaturas "normales" porque es la única que
 * devuelve el fotograma en su relación de aspecto ORIGINAL, sin relleno:
 *
 * - `hqdefault` (480x360) y `sddefault` siempre entregan 4:3, así que a
 *   un video 16:9 le ponen barras negras arriba y abajo, y a un Short
 *   (vertical) le rellenan los lados con una copia ampliada del mismo
 *   fotograma. Eso último se ve como un cuadro con el video dentro y la
 *   misma imagen en grande detrás — feo justo en la tarjeta de rutina.
 * - `mqdefault` y `maxresdefault` siempre son 16:9, con el mismo relleno
 *   lateral en los Shorts.
 * - `oardefault` sí respeta el original pero no existe para todos los
 *   videos (varios devuelven 404).
 *
 * `frame0` se comprobó contra videos verticales, 16:9 y hasta uno viejo
 * en 4:3, y en todos respondió con la relación real del video.
 */
export function youtubeThumbnailUrl(url: string | null): string | null {
  if (!url) return null;
  const id = youtubeVideoId(url);
  if (!id) return null;
  return `https://i.ytimg.com/vi/${id}/frame0.jpg`;
}
