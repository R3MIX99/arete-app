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

// Cuántos meses hacia atrás se pueden explorar en el rango
// personalizado — de sobra para el historial de cualquier cliente sin
// tener que ir agregando meses sobre la marcha.
const CUSTOM_RANGE_MONTHS_BACK = 24;

/** Orden cronológico ascendente (el más viejo arriba, el mes actual
 * hasta abajo) — como Airbnb: el mes de hoy es lo primero que se ve
 * porque el scroll arranca pegado abajo, y subir revela los meses
 * anteriores. Bajar no revela nada más porque no hay meses futuros. */
function monthsAscending(count: number): Date[] {
  const current = startOfMonth(new Date());
  return Array.from({ length: count }, (_, i) => subMonths(current, count - 1 - i));
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
  const monthsScrollRef = React.useRef<HTMLDivElement>(null);

  // Arranca pegado hasta abajo de la lista (el mes actual, que es el
  // último del arreglo ascendente) — antes de que se pinte, para que no
  // se alcance a ver un salto desde el mes más viejo. Se repite cada vez
  // que se abre esta vista porque el scroll se resetea al desmontar.
  React.useLayoutEffect(() => {
    if (customOpen && monthsScrollRef.current) {
      monthsScrollRef.current.scrollTop = monthsScrollRef.current.scrollHeight;
    }
  }, [customOpen]);

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
          <div className="flex flex-col gap-3 pb-2">
            {/* Scroll vertical en vez de flechitas para cambiar de mes,
                como en Airbnb: arranca pegado abajo mostrando el mes de
                hoy, y subir va revelando los meses anteriores. Bajar no
                hace nada porque no hay meses futuros que mostrar.
                data-vaul-no-drag evita que el gesto de arrastrar para
                cerrar el drawer se coma el scroll de esta lista en el
                teléfono. */}
            <div
              ref={monthsScrollRef}
              data-vaul-no-drag
              className="flex max-h-[50vh] flex-col items-center gap-4 overflow-y-auto overscroll-contain px-1"
            >
              {monthsAscending(CUSTOM_RANGE_MONTHS_BACK).map((month) => (
                <Calendar
                  key={month.toISOString()}
                  mode="range"
                  selected={draftRange}
                  onSelect={setDraftRange}
                  month={month}
                  numberOfMonths={1}
                  locale={es}
                  disabled={{ after: new Date() }}
                  classNames={{ nav: "hidden" }}
                />
              ))}
            </div>
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
