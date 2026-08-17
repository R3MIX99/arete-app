"use client";

import * as React from "react";

/**
 * Imagen con una segunda URL de respaldo, para las miniaturas de
 * YouTube: la variante que da mejor encuadre no existe para todos los
 * videos, y un `<img>` no sabe reintentar solo. Al fallar la carga se
 * cambia a la de respaldo, que sí existe siempre.
 */
export function ThumbnailImage({
  src,
  fallbackSrc,
  alt = "",
  className,
  style,
}: {
  src: string;
  fallbackSrc?: string | null;
  alt?: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  // Se guarda cuál falló, no cuál se está mostrando: así, si cambia la
  // foto (p. ej. el entrenador sube otra), la nueva se intenta sola
  // porque ya no coincide con la que había fallado. Con el estado al
  // revés haría falta un efecto para reiniciarlo.
  const [failedSrc, setFailedSrc] = React.useState<string | null>(null);
  const current = failedSrc === src && fallbackSrc ? fallbackSrc : src;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={current}
      alt={alt}
      className={className}
      style={style}
      onError={() => setFailedSrc(src)}
    />
  );
}
