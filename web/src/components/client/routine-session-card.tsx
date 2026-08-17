import Link from "next/link";
import { Check, ChevronRight, Dumbbell, RefreshCw } from "lucide-react";

import { cn } from "@/lib/utils";

export type RoutineSessionStatus = "completed" | "in_progress" | "not_started";

/** Metadatos de una rutina que la tarjeta necesita y que no vienen en
 * el cálculo del calendario (que solo sabe nombre e id). Se arma en el
 * servidor con una consulta aparte, indexada por routine_id. */
export interface RoutineCardMeta {
  imageUrl: string | null;
  exerciseCount: number;
  setCount: number;
}

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
      <div className="relative flex min-h-24 overflow-hidden rounded-2xl bg-card transition-colors hover:bg-accent/40">
        {/* La foto va de fondo, ocupando tres cuartos del ancho: una
            imagen cuadrada se recorta con object-cover en vez de
            estirarse a toda la tarjeta. */}
        <div className="absolute inset-y-0 left-0 w-3/4">
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imageUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-primary/12 text-primary">
              <Dumbbell className="size-6" />
            </div>
          )}
        </div>

        {/* El degradado cubre la tarjeta COMPLETA, no solo la foto: así
            el borde derecho de la imagen queda debajo de la parte ya
            opaca y no se ve el corte. Va de derecha a izquierda:
            totalmente opaco donde está el texto, luego baja muy poco
            (85% a media rampa) y solo al final se abre para dejar ver la
            foto. Nunca llega a transparente del todo — un salto de
            opaco a transparente en un solo tramo se lee como una línea
            vertical, que es justo lo que se veía antes. Usa el token
            --card, así que funciona igual en claro y en oscuro. */}
        <div className="absolute inset-0 bg-gradient-to-l from-card from-58% via-card/85 via-78% to-card/20" />

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
