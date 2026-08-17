"use client";

import { useTheme } from "next-themes";
import { Monitor, Moon, Sun } from "lucide-react";

import { cn } from "@/lib/utils";

const THEME_OPTIONS = [
  { value: "light", label: "Modo claro", icon: Sun },
  { value: "dark", label: "Modo oscuro", icon: Moon },
  { value: "system", label: "Según el sistema", icon: Monitor },
] as const;

/**
 * Tres íconos circulares para elegir el tema: el activo se pinta con el
 * color de acento. Se usa igual en el menú de perfil del cliente y en la
 * configuración del entrenador.
 *
 * Usa `theme` y no `resolvedTheme` a propósito: hay que marcar lo que el
 * usuario ELIGIÓ — "según el sistema" incluido — no el color que acabó
 * aplicándose.
 */
export function ThemePicker({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();

  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      {THEME_OPTIONS.map((option) => {
        const Icon = option.icon;
        const active = theme === option.value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => setTheme(option.value)}
            aria-label={option.label}
            aria-pressed={active}
            title={option.label}
            className={cn(
              "flex size-7 items-center justify-center rounded-full transition-colors",
              active
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
          >
            <Icon className="size-4" />
          </button>
        );
      })}
    </div>
  );
}
