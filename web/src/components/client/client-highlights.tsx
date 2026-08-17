"use client";

import { Trophy, TrendingDown, TrendingUp, Minus, Scale } from "lucide-react";

import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";

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

/** Mini-gráfica de línea sin ejes ni librerías: solo la silueta de la
 * tendencia, que es lo único que aporta en un espacio tan chico. */
function Sparkline({ points }: { points: WeightPoint[] }) {
  if (points.length < 2) return null;
  const values = points.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  // Si todos los valores son iguales el rango es 0 y dividir daría NaN:
  // en ese caso la línea va plana a media altura.
  const range = max - min || 1;
  const path = points
    .map((p, i) => {
      const x = (i / (points.length - 1)) * 100;
      const y = max === min ? 50 : 100 - ((p.value - min) / range) * 100;
      return `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");

  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      className="h-10 w-full"
      aria-hidden="true"
    >
      <path
        d={path}
        fill="none"
        stroke="currentColor"
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

export function ClientWeightTrend({ points }: { points: WeightPoint[] }) {
  if (points.length === 0) return null;

  const last = points[points.length - 1];
  const previous = points.length > 1 ? points[points.length - 2] : null;
  const delta = previous ? last.value - previous.value : 0;
  const rounded = Math.round(delta * 10) / 10;

  const Icon = rounded > 0 ? TrendingUp : rounded < 0 ? TrendingDown : Minus;

  return (
    <Card>
      <CardContent className="flex flex-col gap-2 p-4">
        <div className="flex items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Scale className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs text-muted-foreground">Tu peso</p>
            <p className="text-lg leading-tight font-semibold tabular-nums">
              {last.value} <span className="text-sm font-normal">kg</span>
            </p>
          </div>
          {previous ? (
            // Subir o bajar no es bueno ni malo por sí solo — depende del
            // objetivo del cliente — así que se muestra neutro, sin
            // verde/rojo.
            <div className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
              <Icon className="size-3.5" />
              <span className="tabular-nums">
                {rounded > 0 ? "+" : ""}
                {rounded} kg
              </span>
            </div>
          ) : null}
        </div>

        <div className="text-primary">
          <Sparkline points={points} />
        </div>

        <p className="text-[11px] text-muted-foreground">
          Último registro: {formatDate(last.date)}
        </p>
      </CardContent>
    </Card>
  );
}

export function ClientRecords({ records }: { records: PersonalRecord[] }) {
  if (records.length === 0) return null;

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 p-4">
        <div className="flex items-center gap-2">
          <Trophy className="size-4 text-amber-400" />
          <p className="text-sm font-medium">Tus récords recientes</p>
        </div>

        <div className="flex flex-col gap-2">
          {records.map((record) => (
            <div
              key={`${record.exerciseId}:${record.date}`}
              className={cn(
                "flex items-center justify-between gap-3 rounded-lg bg-muted/40 px-3 py-2",
              )}
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{record.exerciseName}</p>
                <p className="text-[11px] text-muted-foreground">{formatDate(record.date)}</p>
              </div>
              <span className="shrink-0 text-sm font-semibold tabular-nums text-primary">
                {record.weight} kg
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
