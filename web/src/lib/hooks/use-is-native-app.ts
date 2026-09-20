"use client";

import * as React from "react";
import { Capacitor } from "@capacitor/core";

/** true dentro de la app empaquetada con Capacitor (Android/iOS), false en
 * el navegador. Se usa para ocultar todo lo que dirija a pagar o mejorar de
 * plan: las tiendas de apps no permiten mostrar precios ni enlazar a un pago
 * externo dentro de la app; los planes se contratan solo en el sitio web. */
export function isNativeApp(): boolean {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

const subscribe = () => () => {};

/** Versión para renderizar: en el servidor y en la primera pasada del
 * cliente vale false, y React la corrige sin errores de hidratación. */
export function useIsNativeApp(): boolean {
  return React.useSyncExternalStore(subscribe, isNativeApp, () => false);
}
