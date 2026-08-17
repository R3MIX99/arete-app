import { cn } from "@/lib/utils";

export interface BarItem {
  label: string;
  value: number;
  /** Texto opcional a la derecha; si no, se muestra el valor. */
  hint?: string;
}

/**
 * Ranking en barras horizontales. Se hace con divs y no con una librería
 * de gráficas porque para "top N" una barra proporcional se lee igual de
 * bien y no agrega peso al bundle.
 */
export function BarList({
  items,
  emptyMessage = "Todavía no hay datos.",
  className,
}: {
  items: BarItem[];
  emptyMessage?: string;
  className?: string;
}) {
  if (items.length === 0) {
    return <p className="py-6 text-center text-sm text-muted-foreground">{emptyMessage}</p>;
  }

  // El máximo marca el 100% del ancho. Nunca es 0 aquí porque las listas
  // sin datos ya salieron arriba, pero se protege la división igual.
  const max = Math.max(...items.map((i) => i.value), 1);

  return (
    <div className={cn("flex flex-col gap-2.5", className)}>
      {items.map((item) => (
        <div key={item.label} className="flex flex-col gap-1">
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="min-w-0 truncate">{item.label}</span>
            <span className="shrink-0 font-medium tabular-nums text-muted-foreground">
              {item.hint ?? item.value}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${Math.max((item.value / max) * 100, 2)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
