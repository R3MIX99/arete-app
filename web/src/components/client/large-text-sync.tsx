"use client";

import { useEffect } from "react";

import { applyLargeTextClass, getLargeTextPref } from "@/lib/large-text";

/** Aplica la preferencia de texto grande guardada al cargar cualquier
 * pantalla del panel de cliente — sin esto, la clase en <html> solo se
 * pondría al visitar Configuración, que es donde vive el switch. */
export function LargeTextSync() {
  useEffect(() => {
    applyLargeTextClass(getLargeTextPref());
  }, []);

  return null;
}
