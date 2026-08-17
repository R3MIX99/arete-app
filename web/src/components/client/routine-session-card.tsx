import Link from "next/link";
import { Check, ChevronRight, Dumbbell, RefreshCw } from "lucide-react";

import { cn } from "@/lib/utils";
import { ThumbnailImage } from "@/components/client/thumbnail-image";

export type RoutineSessionStatus = "completed" | "in_progress" | "not_started";

/** Metadatos de una rutina que la tarjeta necesita y que no vienen en
 * el cálculo del calendario (que solo sabe nombre e id). Se arma en el
 * servidor con una consulta aparte, indexada por routine_id. */
export interface RoutineCardMeta {
  imageUrl: string | null;
  /** Segunda URL por si `imageUrl` es una miniatura de YouTube que no
   * existe para ese video. Null cuando es una foto subida. */
  imageFallbackUrl: string | null;
  exerciseCount: number;
  setCount: number;
}

/**
 * Desvanecido de la foto, en coordenadas del <img> (que mide la mitad
 * de la tarjeta, así que cada valor de aquí es la mitad en la tarjeta).
 *
 * Son muchas paradas a propósito: con solo dos, el arranque y el final
 * de la rampa son quiebres de pendiente y el ojo los lee como una línea
 * vertical — se veía "cortado". Con esta curva en S baja apenas al
 * principio (97%, 85%), cae en la parte media y vuelve a aplanarse al
 * final (10%, 0%), así que ni el inicio ni el final del difuminado se
 * notan. Termina justo antes del texto para que no quede foto detrás.
 */
const IMAGE_FADE_MASK =
  "linear-gradient(to right," +
  " rgb(0 0 0 / 1) 0%," +
  " rgb(0 0 0 / 0.97) 14%," +
  " rgb(0 0 0 / 0.85) 28%," +
  " rgb(0 0 0 / 0.6) 42%," +
  " rgb(0 0 0 / 0.32) 54%," +
  " rgb(0 0 0 / 0.1) 64%," +
  " transparent 72%)";

const STATUS_CHIP: Record<RoutineSessionStatus, { label: string; className: string }> = {
  completed: { label: "Completada", className: "bg-success text-white" },
  // Índigo más profundo que el primary del botón "Comenzar", para que
  // un entrenamiento a medias no se confunda con uno sin empezar.
  in_progress: { label: "En progreso", className: "bg-indigo-600 text-white" },
  not_started: { label: "Comenzar", className: "bg-primary text-primary-foreground" },
};

/**
 * Tarjeta de rutina del panel del cliente: foto de portada a la
 * izquierda que se difumina hacia el fondo de la tarjeta, nombre de la
 * rutina, programa al que pertenece, cuántos ejercicios y series trae,
 * y un chip de estado. Se usa igual en Inicio ("tu entrenamiento de
 * hoy") y en la Agenda — en el Historial se sigue usando el ícono,
 * porque ahí la foto no aporta nada.
 *
 * El chip va en la misma fila que los contadores, no flotando en la
 * esquina: en un teléfono la tarjeta es angosta y encimaba los números.
 */
export function RoutineSessionCard({
  href,
  routineName,
  subtitle,
  meta,
  status,
}: {
  href: string;
  routineName: string;
  subtitle: string | null;
  meta: RoutineCardMeta | undefined;
  status: RoutineSessionStatus;
}) {
  const chip = STATUS_CHIP[status];
  const imageUrl = meta?.imageUrl ?? null;

  return (
    <Link href={href} className="block">
      <div className="relative flex min-h-32 overflow-hidden rounded-2xl bg-card transition-colors hover:bg-accent/40">
        {imageUrl ? (
          /* La foto va de fondo, ocupando la mitad del ancho. Con
             object-cover, mientras más ancha y baja sea la caja más
             brutal es el recorte: a tres cuartos de ancho y 96px de
             alto, de un video vertical se alcanzaba a ver apenas un 8%
             de su altura, o sea un pedacito enormemente ampliado. Con la
             caja más angosta y la tarjeta más alta la proporción se
             acerca a la de la foto y se aprecia mucho mejor.

             El desvanecido se hace con una MÁSCARA sobre la propia foto,
             no tapándola con un degradado del color de la tarjeta. En
             modo oscuro `--card` es un vidrio translúcido
             (oklch(... / 0.8)), así que un degradado hecho con ese token
             nunca llega a tapar del todo: la foto se transparentaba por
             toda la tarjeta y se veía "doble". Con máscara desaparece de
             verdad, y de paso funciona igual en claro y en oscuro sin
             tener que igualar ningún color. */
          <ThumbnailImage
            src={imageUrl}
            fallbackSrc={meta?.imageFallbackUrl}
            className="absolute inset-y-0 left-0 h-full w-1/2 object-cover"
            style={{ maskImage: IMAGE_FADE_MASK, WebkitMaskImage: IMAGE_FADE_MASK }}
          />
        ) : (
          /* Sin foto NO se pinta ningún bloque de color de fondo. Antes
             había un rectángulo bg-primary/12 de tres cuartos de ancho y
             el degradado, al destaparlo, dejaba ver su borde como una
             raya vertical — sobre un color plano el corte se nota mucho
             más que sobre una foto. Queda solo el ícono, y centrado en
             el tercio izquierdo para que no caiga detrás del texto. */
          <div className="absolute inset-y-0 left-0 flex w-[30%] items-center justify-center text-primary/30">
            <Dumbbell className="size-7" />
          </div>
        )}

        <div className="relative flex min-w-0 flex-1 flex-col justify-center gap-1 py-3 pr-3 pl-[36%]">
          <p className="line-clamp-2 text-sm leading-snug font-bold">{routineName}</p>
          {subtitle ? (
            <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
          ) : null}

          <div className="mt-0.5 flex items-center justify-between gap-2">
            <div className="flex shrink-0 items-center gap-2.5 text-xs font-semibold tabular-nums">
              <span className="flex items-center gap-1 text-primary">
                <Dumbbell className="size-3.5" />
                <span className="text-foreground">{meta?.exerciseCount ?? 0}</span>
              </span>
              <span className="flex items-center gap-1 text-primary">
                <RefreshCw className="size-3.5" />
                <span className="text-foreground">{meta?.setCount ?? 0}</span>
              </span>
            </div>

            <span
              className={cn(
                "inline-flex shrink-0 items-center gap-0.5 rounded-full py-1 pr-1.5 pl-2.5 text-xs font-semibold",
                chip.className,
              )}
            >
              {chip.label}
              {status === "completed" ? (
                <Check className="size-3.5" />
              ) : (
                <ChevronRight className="size-3.5" />
              )}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
