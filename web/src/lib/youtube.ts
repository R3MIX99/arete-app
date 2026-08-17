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

export interface YoutubeThumbnails {
  /** Fotograma de la mitad del video: ya pasó cualquier carátula o
   * texto de intro, que es lo que arruinaba usar el fotograma 0. */
  primary: string;
  /** Por si `primary` no existe para ese video (algunos devuelven 404).
   * Se usa desde el cliente con onError. */
  fallback: string;
}

/**
 * Miniaturas del video para usarlas como imagen cuando el ejercicio o
 * la rutina no tiene foto propia. Elegir cuál pedir no es trivial:
 *
 * - Todas las miniaturas de tamaño fijo (`mq*`, `hq*`, `sd*`, `maxres*`)
 *   entregan siempre 16:9 o 4:3 pase lo que pase con el video. A un
 *   Short (vertical) le rellenan los lados con una copia ampliada y
 *   oscurecida del mismo cuadro — se ve como un recuadro con el video
 *   dentro y la misma imagen en grande detrás. Se verificó midiendo el
 *   brillo de los bordes contra el centro: en un Short los laterales
 *   quedan ~15 contra ~78 del centro, en las cuatro resoluciones.
 * - `oar*` ("original aspect ratio") sí respeta la forma real del
 *   video, y resulta que existe justo cuando el video NO es 16:9 — o
 *   sea, en los Shorts, que es donde hace falta. En videos 16:9 suele
 *   devolver 404 o un sello de 120x90 inservible.
 *
 * De ahí la regla: para un enlace de Shorts se pide `oar2`, y para
 * cualquier otro `maxres2`, que en un video 16:9 es un recorte real y
 * en buena resolución (1280x720).
 *
 * El índice 2 es el fotograma de la mitad del video. Se usaba `frame0`
 * antes, pero muchos videos abren con una carátula con el nombre del
 * ejercicio y eso era justo lo que se veía en la tarjeta.
 */
export function youtubeThumbnails(url: string | null): YoutubeThumbnails | null {
  if (!url) return null;
  const id = youtubeVideoId(url);
  if (!id) return null;

  const isShort = url.includes("/shorts/");
  return isShort
    ? {
        primary: `https://i.ytimg.com/vi/${id}/oar2.jpg`,
        // frame0 también respeta el original y existe siempre; trae la
        // carátula si el video la tiene, pero es mejor que el recuadro.
        fallback: `https://i.ytimg.com/vi/${id}/frame0.jpg`,
      }
    : {
        primary: `https://i.ytimg.com/vi/${id}/maxres2.jpg`,
        // Videos viejos no tienen maxres; mq2 existe siempre.
        fallback: `https://i.ytimg.com/vi/${id}/mq2.jpg`,
      };
}
