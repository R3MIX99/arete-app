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
      <div className="relative min-h-36 overflow-hidden rounded-2xl bg-card transition-colors hover:bg-accent/40">
        <div className="absolute inset-y-0 left-0 w-[46%]">
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imageUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-primary/12 text-primary">
              <Dumbbell className="size-8" />
            </div>
          )}
          {/* Difuminado hacia el fondo de la tarjeta: usa el token
              --card, así funciona igual en claro y en oscuro. */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-card/50 to-card" />
        </div>

        <div className="relative flex min-h-36 flex-col justify-center gap-1 py-4 pr-4 pl-[48%]">
          <p className="line-clamp-2 text-lg leading-tight font-bold">{routineName}</p>
          {subtitle ? (
            <p className="truncate text-sm text-muted-foreground">{subtitle}</p>
          ) : null}
          <div className="mt-1 flex items-center gap-4 text-sm font-semibold tabular-nums">
            <span className="flex items-center gap-1.5 text-primary">
              <Dumbbell className="size-4" />
              <span className="text-foreground">{meta?.exerciseCount ?? 0}</span>
            </span>
            <span className="flex items-center gap-1.5 text-primary">
              <RefreshCw className="size-4" />
              <span className="text-foreground">{meta?.setCount ?? 0}</span>
            </span>
          </div>
        </div>

        <span
          className={cn(
            "absolute right-3 bottom-3 inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-semibold",
            chip.className,
          )}
        >
          {chip.label}
          {status === "completed" ? (
            <Check className="size-4" />
          ) : (
            <ChevronRight className="size-4" />
          )}
        </span>
      </div>
    </Link>
  );
}
