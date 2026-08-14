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
 *
 * Al pasar el mouse (o tocar en pantalla táctil) sobre la gráfica, se
 * resalta el punto más cercano y aparece un tooltip con su fecha y
 * valor exactos — se actualiza punto por punto conforme te mueves.
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
  const [hoverIndex, setHoverIndex] = React.useState<number | null>(null);

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

  const active = hoverIndex !== null ? coords[hoverIndex] : null;

  function pointerToIndex(clientX: number, svg: SVGSVGElement) {
    const rect = svg.getBoundingClientRect();
    const ratio = (clientX - rect.left) / rect.width;
    const x = ratio * width;
    let closest = 0;
    let closestDist = Infinity;
    coords.forEach((c, i) => {
      const dist = Math.abs(c.x - x);
      if (dist < closestDist) {
        closestDist = dist;
        closest = i;
      }
    });
    return closest;
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline gap-2">
        <p className="text-2xl font-semibold tabular-nums">
          {active ? active.value : last}
          {unit && <span className="ml-1 text-sm text-muted-foreground">{unit}</span>}
        </p>
        {active ? (
          <p className="text-xs text-muted-foreground">{active.label}</p>
        ) : (
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
        )}
      </div>

      <div className="relative">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full overflow-visible text-primary"
          preserveAspectRatio="none"
          onMouseMove={(e) => setHoverIndex(pointerToIndex(e.clientX, e.currentTarget))}
          onMouseLeave={() => setHoverIndex(null)}
          onTouchStart={(e) =>
            setHoverIndex(pointerToIndex(e.touches[0].clientX, e.currentTarget))
          }
          onTouchMove={(e) =>
            setHoverIndex(pointerToIndex(e.touches[0].clientX, e.currentTarget))
          }
          onTouchEnd={() => setHoverIndex(null)}
        >
          <path d={areaPath} fill="currentColor" opacity={0.08} stroke="none" />
          <path d={linePath} fill="none" stroke="currentColor" strokeWidth={2} />

          {active && (
            <line
              x1={active.x}
              y1={padY}
              x2={active.x}
              y2={height - padY}
              stroke="currentColor"
              strokeWidth={1}
              strokeDasharray="3 3"
              opacity={0.35}
            />
          )}

          {coords.map((c, i) => (
            <circle
              key={c.label + c.x}
              cx={c.x}
              cy={c.y}
              r={hoverIndex === i ? 5 : 3}
              fill="currentColor"
              className="transition-[r]"
            />
          ))}
        </svg>

        {active && (
          <div
            className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-md border bg-popover px-2 py-1 text-xs whitespace-nowrap text-popover-foreground shadow-md"
            style={{
              left: `${(active.x / width) * 100}%`,
              top: `${Math.max((active.y / height) * 100 - 6, 0)}%`,
            }}
          >
            <p className="font-semibold tabular-nums">
              {active.value}
              {unit && <span className="ml-0.5 font-normal text-muted-foreground">{unit}</span>}
            </p>
            <p className="text-muted-foreground">{active.label}</p>
          </div>
        )}
      </div>

      <div className="flex justify-between text-[11px] text-muted-foreground">
        <span>{points[0].label}</span>
        <span>{points[points.length - 1].label}</span>
      </div>
    </div>
  );
}
