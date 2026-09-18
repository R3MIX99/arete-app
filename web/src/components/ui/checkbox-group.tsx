"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

/** Grupo de checkboxes para elegir uno o varios valores de una lista de
 * opciones — usado donde antes había un <Select> de una sola opción pero
 * ahora se puede elegir más de un valor (grupo muscular, equipo). */
export function CheckboxGroup({
  idPrefix,
  options,
  value,
  onChange,
  columns = 2,
}: {
  idPrefix: string;
  options: { value: string; label: string }[];
  value: string[];
  onChange: (next: string[]) => void;
  columns?: 2 | 3;
}) {
  function toggle(optionValue: string, checked: boolean) {
    if (checked) {
      if (!value.includes(optionValue)) onChange([...value, optionValue]);
    } else {
      onChange(value.filter((v) => v !== optionValue));
    }
  }

  return (
    <div className={columns === 3 ? "grid grid-cols-3 gap-x-3 gap-y-2" : "grid grid-cols-2 gap-x-3 gap-y-2"}>
      {options.map((option) => {
        const id = `${idPrefix}-${option.value}`;
        return (
          <div key={option.value} className="flex items-center gap-2">
            <Checkbox
              id={id}
              checked={value.includes(option.value)}
              onCheckedChange={(checked) => toggle(option.value, checked === true)}
            />
            <Label htmlFor={id} className="text-sm font-normal">
              {option.label}
            </Label>
          </div>
        );
      })}
    </div>
  );
}
