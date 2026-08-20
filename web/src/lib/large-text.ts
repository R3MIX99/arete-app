/**
 * Preferencia de "texto grande" para el panel de cliente — pensada para
 * clientes mayores a quienes les cuesta leer los números/inputs chicos
 * al anotar sus series. Vive en localStorage (no en la base de datos):
 * es una preferencia de este dispositivo/navegador, no de la cuenta —
 * evita tocar RLS/columnas nuevas por algo que no necesita sincronizar
 * entre dispositivos.
 *
 * Escala el font-size del <html> completo (no solo un contenedor): como
 * casi todo en la app usa unidades rem de Tailwind (texto Y espaciados),
 * es la única forma de que el toggle agrande todo de forma consistente
 * sin tener que retocar cada componente uno por uno.
 */
const STORAGE_KEY = "arete-large-text";
const HTML_CLASS = "text-scale-lg";

export function getLargeTextPref(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(STORAGE_KEY) === "1";
}

export function applyLargeTextClass(enabled: boolean) {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle(HTML_CLASS, enabled);
}

export function setLargeTextPref(enabled: boolean) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, enabled ? "1" : "0");
  applyLargeTextClass(enabled);
}
