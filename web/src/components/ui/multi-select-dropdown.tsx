"use client";

import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CheckboxGroup } from "@/components/ui/checkbox-group";

/** Selector de varios valores que se ve como un solo campo (botón con el
 * resumen de lo elegido) y al abrirse muestra las opciones en checkboxes
 * de dos columnas — para no ocupar toda la pantalla como una lista fija
 * de casillas siempre abierta. */
export function MultiSelectDropdown({
  idPrefix,
  options,
  value,
  onChange,
  placeholder,
  columns = 2,
}: {
  idPrefix: string;
  options: { value: string; label: string }[];
  value: string[];
  onChange: (next: string[]) => void;
  placeholder: string;
  columns?: 2 | 3;
}) {
  const summary =
    value.length === 0
      ? placeholder
      : value
          .map((v) => options.find((o) => o.value === v)?.label ?? v)
          .join(", ");

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn(
            "h-auto w-full min-w-0 justify-between px-3 py-2 text-left font-normal",
            value.length === 0 && "text-muted-foreground",
          )}
        >
          <span className="min-w-0 truncate">{summary}</span>
          <ChevronDown className="size-4 shrink-0 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 max-w-[calc(100vw-2rem)]">
        <CheckboxGroup
          idPrefix={idPrefix}
          options={options}
          value={value}
          onChange={onChange}
          columns={columns}
        />
      </PopoverContent>
    </Popover>
  );
}
