"use client";

import { usePathname } from "next/navigation";

import { BottomNav } from "@/components/client/bottom-nav";

/** La nav inferior se esconde en la vista previa de una rutina y en la
 * sesión activa de entrenamiento — ahí abajo va fijo el botón de
 * Iniciar/Terminar entrenamiento y la nav flotante le estorbaría. */
const HIDDEN_ON = new Set(["/cliente/entrenamiento/sesion", "/cliente/entrenamiento/sesion/preview"]);

export function ClientBottomNavGate() {
  const pathname = usePathname();
  if (HIDDEN_ON.has(pathname)) return null;
  return <BottomNav />;
}
