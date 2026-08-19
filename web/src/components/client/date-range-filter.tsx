"use client";

import * as React from "react";
import { endOfDay, format, startOfDay, startOfMonth, subMonths } from "date-fns";
import { es } from "date-fns/locale";
import type { DateRange } from "react-day-picker";
import { Filter } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";

export type SessionDateRange = { from: Date; to: Date };

const PRESETS: { label: string; range: () => SessionDateRange }[] = [
  {
    label: "Este mes",
    range: () => ({ from: startOfMonth(new Date()), to: endOfDay(new Date()) }),
  },
  {
    label: "Últimos 3 meses",
    range: () => ({ from: startOfDay(subMonths(new Date(), 3)), to: endOfDay(new Date()) }),
  },
  {
    label: "Últimos 6 meses",
    range: () => ({ from: startOfDay(subMonths(new Date(), 6)), to: endOfDay(new Date()) }),
  },
];

function formatRange(range: SessionDateRange): string {
  return `${format(range.from, "d MMM", { locale: es })} – ${format(range.to, "d MMM", { locale: es })}`;
}

/**
 * Filtro por fecha del Historial: presets rápidos (este mes, 3/6 meses)
 * más un rango personalizado con nuestro propio Calendar (react-day-picker)
 * — no hay un selector de fecha "de fábrica" que permita elegir un rango
 * con dos clics y calendario visual, ni en el navegador ni en React, así
 * que se arma con esa librería en vez del <input type="date"> nativo del
 * sistema (que además se ve distinto en cada dispositivo).
 */
export function DateRangeFilter({
  value,
  onChange,
}: {
  value: SessionDateRange | null;
  onChange: (range: SessionDateRange | null) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [customOpen, setCustomOpen] = React.useState(false);
  const [draftRange, setDraftRange] = React.useState<DateRange | undefined>(
    value ? { from: value.from, to: value.to } : undefined,
  );

  function applyPreset(range: SessionDateRange) {
    onChange(range);
    setOpen(false);
    setCustomOpen(false);
  }

  function applyCustomRange() {
    if (!draftRange?.from) return;
    onChange({
      from: startOfDay(draftRange.from),
      to: endOfDay(draftRange.to ?? draftRange.from),
    });
    setOpen(false);
    setCustomOpen(false);
  }

  function clear() {
    onChange(null);
    setDraftRange(undefined);
    setOpen(false);
    setCustomOpen(false);
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="relative shrink-0"
        onClick={() => setOpen(true)}
      >
        <Filter className="size-4" />
        {value ? formatRange(value) : "Fecha"}
        {value && <span className="absolute -top-1 -right-1 size-2.5 rounded-full bg-primary" />}
      </Button>

      <ResponsiveDialog
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (!o) setCustomOpen(false);
        }}
        title="Filtrar por fecha"
      >
        {!customOpen ? (
          <div className="flex flex-col gap-2 pb-2">
            {PRESETS.map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => applyPreset(preset.range())}
                className="rounded-lg px-3 py-2.5 text-left text-sm font-medium hover:bg-accent"
              >
                {preset.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setCustomOpen(true)}
              className="rounded-lg px-3 py-2.5 text-left text-sm font-medium hover:bg-accent"
            >
              Rango personalizado…
            </button>
            {value && (
              <button
                type="button"
                onClick={clear}
                className="mt-1 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-destructive hover:bg-destructive/10"
              >
                Quitar filtro de fecha
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 pb-2">
            <Calendar
              mode="range"
              selected={draftRange}
              onSelect={setDraftRange}
              defaultMonth={draftRange?.from ?? subMonths(new Date(), 1)}
              numberOfMonths={1}
              locale={es}
              className="mx-auto"
            />
            <div className="flex w-full gap-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setCustomOpen(false)}>
                Atrás
              </Button>
              <Button type="button" className="flex-1" disabled={!draftRange?.from} onClick={applyCustomRange}>
                Aplicar
              </Button>
            </div>
          </div>
        )}
      </ResponsiveDialog>
    </>
  );
}
