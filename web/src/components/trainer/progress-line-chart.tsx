"use client";

import * as React from "react";

interface Point {
  label: string;
  value: number;
}

/**
 * Gráfica de línea minimalista en SVG puro — sin dependencias externas,
 * pensada para series cortas (mediciones mensuales, registros de peso
 * por ejercicio). Theme-aware vía `currentColor` y variables CSS.
 */
export function ProgressLineChart({
  points,
  unit,
  emptyMessage = "Todavía no hay registros para graficar.",
}: {
  points: Point[];
  unit?: string;
  emptyMessage?: string;
}) {
  if (points.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  if (points.length === 1) {
    return (
      <div className="flex h-48 flex-col items-center justify-center gap-1">
        <p className="text-3xl font-semibold tabular-nums">
          {points[0].value}
          {unit && <span className="ml-1 text-base text-muted-foreground">{unit}</span>}
        </p>
        <p className="text-xs text-muted-foreground">{points[0].label}</p>
        <p className="text-xs text-muted-foreground">
          Agrega otro registro para ver la tendencia.
        </p>
      </div>
    );
  }

  const width = 640;
  const height = 200;
  const padX = 28;
  const padY = 24;

  const values = points.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const stepX = (width - padX * 2) / (points.length - 1);
  const coords = points.map((p, i) => {
    const x = padX + i * stepX;
    const y = padY + (height - padY * 2) * (1 - (p.value - min) / range);
    return { x, y, ...p };
  });

  const linePath = coords.map((c, i) => `${i === 0 ? "M" : "L"}${c.x},${c.y}`).join(" ");
  const areaPath = `${linePath} L${coords[coords.length - 1].x},${height - padY} L${coords[0].x},${height - padY} Z`;

  const first = points[0].value;
  const last = points[points.length - 1].value;
  const delta = last - first;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline gap-2">
        <p className="text-2xl font-semibold tabular-nums">
          {last}
          {unit && <span className="ml-1 text-sm text-muted-foreground">{unit}</span>}
        </p>
        <p
          className={
            delta === 0
              ? "text-xs text-muted-foreground"
              : delta > 0
                ? "text-xs text-success"
                : "text-xs text-destructive"
          }
        >
          {delta > 0 ? "+" : ""}
          {Math.round(delta * 100) / 100}
          {unit} desde el primer registro
        </p>
      </div>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full overflow-visible text-primary"
        preserveAspectRatio="none"
      >
        <path d={areaPath} fill="currentColor" opacity={0.08} stroke="none" />
        <path d={linePath} fill="none" stroke="currentColor" strokeWidth={2} />
        {coords.map((c) => (
          <circle key={c.label + c.x} cx={c.x} cy={c.y} r={3} fill="currentColor" />
        ))}
      </svg>

      <div className="flex justify-between text-[11px] text-muted-foreground">
        <span>{points[0].label}</span>
        <span>{points[points.length - 1].label}</span>
      </div>
    </div>
  );
}
