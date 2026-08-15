"use client";

import { useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { ProgressLineChart } from "@/components/trainer/progress-line-chart";
import { cn } from "@/lib/utils";

interface ChartPage {
  label: string;
  unit?: string;
  points: { label: string; value: number }[];
  emptyMessage?: string;
}

/** Dos gráficas (p. ej. peso y repeticiones) que se deslizan
 * horizontalmente con el dedo — scroll-snap nativo, sin librerías —
 * con puntitos abajo que indican en cuál estás y también se pueden
 * tocar para saltar. */
export function SwipeableChartPair({ pages }: { pages: [ChartPage, ChartPage] }) {
  const [active, setActive] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  function scrollToPage(index: number) {
    const el = containerRef.current;
    if (!el) return;
    el.scrollTo({ left: index * el.clientWidth, behavior: "smooth" });
    setActive(index);
  }

  function handleScroll() {
    const el = containerRef.current;
    if (!el || el.clientWidth === 0) return;
    setActive(Math.round(el.scrollLeft / el.clientWidth));
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-center gap-1.5">
        {pages.map((page, i) => (
          <button
            key={page.label}
            type="button"
            onClick={() => scrollToPage(i)}
            className={cn(
              "rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
              active === i ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {page.label}
          </button>
        ))}
      </div>

      <div className="relative flex items-center">
        <button
          type="button"
          onClick={() => scrollToPage(active - 1)}
          disabled={active === 0}
          aria-label="Gráfica anterior"
          className="absolute left-0 z-10 flex size-6 shrink-0 items-center justify-center rounded-full text-muted-foreground/60 transition-colors hover:text-foreground disabled:pointer-events-none disabled:opacity-0"
        >
          <ChevronLeft className="size-4" />
        </button>

        <div
          ref={containerRef}
          onScroll={handleScroll}
          className="flex snap-x snap-mandatory overflow-x-auto scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {pages.map((page) => (
            <div key={page.label} className="w-full shrink-0 snap-center px-0.5">
              <ProgressLineChart unit={page.unit} points={page.points} emptyMessage={page.emptyMessage} />
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={() => scrollToPage(active + 1)}
          disabled={active === pages.length - 1}
          aria-label="Siguiente gráfica"
          className="absolute right-0 z-10 flex size-6 shrink-0 items-center justify-center rounded-full text-muted-foreground/60 transition-colors hover:text-foreground disabled:pointer-events-none disabled:opacity-0"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>

      <div className="flex justify-center gap-1.5">
        {pages.map((page, i) => (
          <span
            key={page.label}
            className={cn("size-1.5 rounded-full transition-colors", active === i ? "bg-foreground" : "bg-muted-foreground/30")}
          />
        ))}
      </div>
    </div>
  );
}
