/** Color de acento por defecto de Aretia (el índigo de globals.css). */
export const DEFAULT_BRAND_COLOR = "#4F46E5";

export const BRAND_COLOR_PRESETS: { label: string; hex: string }[] = [
  { label: "Índigo", hex: "#4F46E5" },
  { label: "Azul", hex: "#2563EB" },
  { label: "Turquesa", hex: "#0D9488" },
  { label: "Verde", hex: "#16A34A" },
  { label: "Naranja", hex: "#EA580C" },
  { label: "Rojo", hex: "#DC2626" },
  { label: "Rosa", hex: "#DB2777" },
  { label: "Violeta", hex: "#7C3AED" },
];

const HEX = /^#[0-9a-fA-F]{6}$/;

export function isValidHex(value: string): boolean {
  return HEX.test(value);
}

/** Acepta "ea580c" o "#EA580C" y devuelve "#EA580C"; null si no es válido. */
export function normalizeHex(value: string): string | null {
  const trimmed = value.trim();
  const withHash = trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
  return isValidHex(withHash) ? withHash.toUpperCase() : null;
}

function channel(hex: string, start: number): number {
  return parseInt(hex.slice(start, start + 2), 16) / 255;
}

function linear(value: number): number {
  return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

/** Luminancia relativa (WCAG) de un color "#RRGGBB". */
function luminance(hex: string): number {
  return 0.2126 * linear(channel(hex, 1)) + 0.7152 * linear(channel(hex, 3)) + 0.0722 * linear(channel(hex, 5));
}

/** Blanco u oscuro para el texto sobre `hex`. Se prefiere blanco mientras
 * tenga al menos 3:1 de contraste (suficiente para el texto en negrita de
 * botones y chips); solo con colores muy claros, como un amarillo, pasa a
 * oscuro. */
export function readableForeground(hex: string): string {
  const contrastWithWhite = 1.05 / (luminance(hex) + 0.05);
  return contrastWithWhite >= 3 ? "#FFFFFF" : "#111111";
}

/** Variables CSS que reemplazan al acento de la app. En modo oscuro el color
 * se aclara un poco para que siga leyéndose sobre el fondo oscuro (igual que
 * hace el índigo por defecto). */
function accentVariables(hex: string, dark: boolean): Record<string, string> {
  const primary = dark ? `color-mix(in oklab, ${hex} 82%, white)` : hex;
  const foreground = readableForeground(hex);
  return {
    "--primary": primary,
    "--primary-foreground": foreground,
    "--ring": `color-mix(in oklab, ${hex} 50%, transparent)`,
    "--sidebar-primary": primary,
    "--sidebar-primary-foreground": foreground,
  };
}

/** Estilos en línea para un contenedor concreto (la vista previa). */
export function brandInlineStyle(hex: string, dark = false): Record<string, string> {
  return accentVariables(hex, dark);
}

function declarations(vars: Record<string, string>): string {
  return Object.entries(vars)
    .map(([name, value]) => `${name}:${value}`)
    .join(";");
}

/** Hoja de estilos que cambia el acento de toda la página, portales de
 * menús y diálogos incluidos (por eso no basta con estilos en un
 * contenedor). El doble `:root` sube la especificidad para ganarle al tema
 * base sin importar el orden de las hojas. */
export function brandStyleSheet(hex: string): string {
  return (
    `:root:root{${declarations(accentVariables(hex, false))}}` +
    `:root:root.dark{${declarations(accentVariables(hex, true))}}`
  );
}
