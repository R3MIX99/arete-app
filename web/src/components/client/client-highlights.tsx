"use client";

import { Trophy, TrendingDown, TrendingUp, Minus, Scale } from "lucide-react";

import { formatDate } from "@/lib/format";
import { HomeSectionTitle } from "@/components/client/home-section-title";

export interface PersonalRecord {
  exerciseId: string;
  exerciseName: string;
  date: string;
  weight: number;
}

export interface WeightPoint {
  date: string;
  value: number;
}

/** Posición (0 a 100) de un valor dentro del rango, con 0 arriba. Si todos
 * los valores son iguales el rango es 0 y dividir daría NaN: la línea va
 * plana a media altura. */
function yPosition(value: number, min: number, max: number): number {
  return max === min ? 50 : 100 - ((value - min) / (max - min)) * 100;
}

/** Mini-gráfica de línea sin ejes ni librerías, con un punto en el último
 * valor. La línea se estira con el ancho; el punto es HTML aparte porque
 * dentro de un SVG estirado se deformaría en elipse. */
function Sparkline({ points }: { points: WeightPoint[] }) {
  if (points.length < 2) return null;
  const values = points.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const path = points
    .map((p, i) => {
      const x = (i / (points.length - 1)) * 100;
      return `${i === 0 ? "M" : "L"}${x.toFixed(2)},${yPosition(p.value, min, max).toFixed(2)}`;
    })
    .join(" ");
  const lastY = yPosition(values[values.length - 1], min, max);

  return (
    <div className="relative mx-1 h-16 py-2 text-primary">
      <div className="relative size-full">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="size-full" aria-hidden="true">
          <path
            d={path}
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
        <span
          aria-hidden
          className="absolute size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-current"
          style={{ left: "100%", top: `${lastY}%` }}
        />
      </div>
    </div>
  );
}

/** Sección "Tu progreso": peso actual con su cambio y la gráfica. */
export function ClientWeightTrend({ points }: { points: WeightPoint[] }) {
  if (points.length === 0) return null;

  const last = points[points.length - 1];
  const previous = points.length > 1 ? points[points.length - 2] : null;
  const delta = previous ? last.value - previous.value : 0;
  const rounded = Math.round(delta * 10) / 10;

  const Icon = rounded > 0 ? TrendingUp : rounded < 0 ? TrendingDown : Minus;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Scale className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs text-muted-foreground">Peso</p>
          <p className="text-2xl leading-tight font-medium tabular-nums">
            {last.value} <span className="text-base font-normal">kg</span>
          </p>
        </div>
        {previous ? (
          <div className="flex shrink-0 items-center gap-1 text-sm text-muted-foreground">
            <Icon className="size-4 text-success" />
            <span className="tabular-nums">
              {rounded > 0 ? "+" : ""}
              {rounded} kg
            </span>
          </div>
        ) : null}
      </div>

      <Sparkline points={points} />

      <p className="text-xs text-muted-foreground">Último registro: {formatDate(last.date)}</p>
    </div>
  );
}

/** Récords recientes en lista: viñeta, ejercicio y fecha, peso a la derecha. */
export function ClientRecords({ records }: { records: PersonalRecord[] }) {
  if (records.length === 0) return null;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <h3 className="text-lg font-normal">Récords recientes</h3>
        <Trophy className="size-4 text-amber-400" />
      </div>

      <ul className="flex flex-col gap-3">
        {records.map((record) => (
          <li
            key={`${record.exerciseId}:${record.date}`}
            className="flex items-center justify-between gap-3"
          >
            <div className="flex min-w-0 items-start gap-2.5">
              <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
              <div className="min-w-0">
                <p className="truncate text-[15px] leading-snug">{record.exerciseName}</p>
                <p className="text-xs text-muted-foreground">{formatDate(record.date)}</p>
              </div>
            </div>
            <span className="shrink-0 text-[15px] font-medium tabular-nums text-primary">
              {record.weight} kg
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Contenedor de la sección "Tu progreso" (peso y récords). */
export function ClientProgressSection({
  points,
  records,
}: {
  points: WeightPoint[];
  records: PersonalRecord[];
}) {
  if (points.length === 0 && records.length === 0) return null;
  return (
    <section className="flex flex-col gap-5">
      <HomeSectionTitle>Tu progreso</HomeSectionTitle>
      <ClientWeightTrend points={points} />
      <ClientRecords records={records} />
    </section>
  );
}
