"use client";

import { genderLabels } from "@/lib/format";
import { cn } from "@/lib/utils";

const GENDER_OPTIONS = Object.keys(genderLabels) as (keyof typeof genderLabels)[];

/** Tres opciones en fila, mismo lenguaje visual que el resto de
 * selectores tipo chip de la app. Se usa igual en el onboarding del
 * entrenador y del cliente. */
export function GenderPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex gap-2">
      {GENDER_OPTIONS.map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => onChange(option)}
          className={cn(
            "flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
            value === option
              ? "border-primary bg-primary/10 text-foreground"
              : "text-muted-foreground hover:bg-accent",
          )}
        >
          {genderLabels[option]}
        </button>
      ))}
    </div>
  );
}
