export interface ClientEnvironment {
  browser: string;
  os: string;
  device: "Escritorio" | "Móvil" | "Tablet";
  userAgent: string;
}

/**
 * Lectura de navigator.userAgent a mano (sin librería): solo necesitamos
 * distinguir un puñado de casos para los logs — no hace falta arrastrar
 * una dependencia como ua-parser-js para esto. El orden de los checks
 * importa (ej. Edge y Opera también traen "Chrome" en su user agent).
 */
export function describeClientEnvironment(): ClientEnvironment | null {
  if (typeof navigator === "undefined") return null;
  const ua = navigator.userAgent;

  let os = "Desconocido";
  if (/iPhone|iPad|iPod/.test(ua)) os = "iOS";
  else if (/Android/.test(ua)) os = "Android";
  else if (/Mac OS X/.test(ua)) os = "macOS";
  else if (/Windows/.test(ua)) os = "Windows";
  else if (/Linux/.test(ua)) os = "Linux";

  let browser = "Desconocido";
  if (/Edg\//.test(ua)) browser = "Edge";
  else if (/OPR\/|Opera/.test(ua)) browser = "Opera";
  else if (/CriOS/.test(ua)) browser = "Chrome (iOS)";
  else if (/FxiOS/.test(ua)) browser = "Firefox (iOS)";
  else if (/Chrome\//.test(ua)) browser = "Chrome";
  else if (/Firefox\//.test(ua)) browser = "Firefox";
  else if (/Version\/.*Safari\//.test(ua)) browser = "Safari";
  else if (/Safari\//.test(ua)) browser = "Safari";

  const device: ClientEnvironment["device"] = /iPad|Tablet/.test(ua)
    ? "Tablet"
    : /iPhone|iPod|Android.*Mobile|Mobile/.test(ua)
      ? "Móvil"
      : "Escritorio";

  return { browser, os, device, userAgent: ua };
}
