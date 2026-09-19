"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const PAGE_SIZE_OPTIONS = [10, 20, 30, 50, 100];

/** Paginación en el navegador para una lista ya filtrada y ordenada.
 *
 * La página se reinicia a la primera cuando cambia la lista (otro filtro,
 * otra búsqueda, otro orden): se detecta comparando la referencia del
 * arreglo, que las listas de los navegadores (useMemo) solo cambian cuando
 * cambia alguno de esos criterios. Así no hace falta un efecto. */
export function usePagination<T>(items: T[], initialPageSize = PAGE_SIZE_OPTIONS[0]) {
  const [pageSize, setPageSizeState] = React.useState(initialPageSize);
  const [pageState, setPageState] = React.useState<{ items: T[]; page: number }>({
    items,
    page: 1,
  });

  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const requested = pageState.items === items ? pageState.page : 1;
  const page = Math.min(requested, totalPages);
  const start = (page - 1) * pageSize;

  return {
    pageItems: items.slice(start, start + pageSize),
    page,
    pageSize,
    total,
    totalPages,
    from: total === 0 ? 0 : start + 1,
    to: Math.min(start + pageSize, total),
    setPage: (next: number) =>
      setPageState({ items, page: Math.min(Math.max(1, next), totalPages) }),
    setPageSize: (size: number) => {
      setPageSizeState(size);
      setPageState({ items, page: 1 });
    },
  };
}

export type Pagination = ReturnType<typeof usePagination>;

/** 1 … 4 5 6 … 12: siempre la primera y la última, y la actual con sus
 * vecinas. */
function pageWindow(page: number, totalPages: number): (number | "…")[] {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
  const pages = new Set([1, totalPages, page - 1, page, page + 1]);
  const sorted = [...pages].filter((p) => p >= 1 && p <= totalPages).sort((a, b) => a - b);
  const result: (number | "…")[] = [];
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) result.push("…");
    result.push(p);
  });
  return result;
}

export function TablePagination({
  pagination,
  noun = "resultados",
}: {
  pagination: Pagination;
  noun?: string;
}) {
  const { page, pageSize, total, totalPages, from, to, setPage, setPageSize } = pagination;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t px-3 py-2.5 text-sm">
      <div className="flex items-center gap-2 text-muted-foreground">
        <span>Mostrar</span>
        <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v))}>
          <SelectTrigger className="h-8 w-[4.75rem]" aria-label="Elementos por página">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PAGE_SIZE_OPTIONS.map((size) => (
              <SelectItem key={size} value={String(size)}>
                {size}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span>por página</span>
      </div>

      <span className="text-muted-foreground tabular-nums">
        {from}–{to} de {total} {noun}
      </span>

      {totalPages > 1 ? (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            aria-label="Página anterior"
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
          >
            <ChevronLeft className="size-4" />
          </Button>
          {pageWindow(page, totalPages).map((p, i) =>
            p === "…" ? (
              <span key={`gap-${i}`} className="px-1 text-muted-foreground">
                …
              </span>
            ) : (
              <Button
                key={p}
                variant={p === page ? "secondary" : "ghost"}
                size="icon"
                className="size-8 tabular-nums"
                aria-label={`Página ${p}`}
                aria-current={p === page ? "page" : undefined}
                onClick={() => setPage(p)}
              >
                {p}
              </Button>
            ),
          )}
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            aria-label="Página siguiente"
            disabled={page >= totalPages}
            onClick={() => setPage(page + 1)}
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      ) : (
        <span />
      )}
    </div>
  );
}
