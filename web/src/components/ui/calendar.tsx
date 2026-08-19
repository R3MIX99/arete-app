"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker, type DayPickerProps } from "react-day-picker";

import { cn } from "@/lib/utils";

/**
 * Selector de fecha/rango propio, sobre react-day-picker — no hay nada
 * "de fábrica" en React ni en el navegador que sirva para elegir un
 * rango con dos meses lado a lado; esta es la librería estándar para
 * eso, aquí solo se le da la pinta del resto de la app (mismos tokens
 * de color que botones/inputs, círculos para el día seleccionado en vez
 * de cuadros).
 */
function Calendar({ className, classNames, showOutsideDays = true, ...props }: DayPickerProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-0", className)}
      classNames={{
        months: "flex flex-col sm:flex-row gap-4",
        month: "flex flex-col gap-3",
        month_caption: "flex justify-center pt-1 pb-2 relative items-center",
        caption_label: "text-sm font-semibold",
        nav: "flex items-center justify-between absolute inset-x-0 top-0.5",
        button_previous: cn(
          "size-7 flex items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors",
        ),
        button_next: cn(
          "size-7 flex items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors",
        ),
        month_grid: "w-full border-collapse",
        weekdays: "flex",
        weekday: "text-muted-foreground w-9 text-[11px] font-medium uppercase",
        week: "flex w-full mt-1",
        day: "size-9 p-0 text-center text-sm relative",
        day_button: cn(
          "size-9 flex items-center justify-center rounded-full font-normal transition-colors",
          "hover:bg-accent",
        ),
        range_start: "day-range-start rounded-l-full bg-primary/10",
        range_end: "day-range-end rounded-r-full bg-primary/10",
        range_middle: "bg-primary/10 rounded-none",
        selected: "[&>button]:bg-primary [&>button]:text-primary-foreground [&>button]:hover:bg-primary",
        today: "[&>button]:font-semibold [&>button]:text-primary",
        outside: "text-muted-foreground/40",
        disabled: "text-muted-foreground/30 pointer-events-none",
        hidden: "invisible",
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation }) =>
          orientation === "left" ? <ChevronLeft className="size-4" /> : <ChevronRight className="size-4" />,
      }}
      {...props}
    />
  );
}

export { Calendar };
