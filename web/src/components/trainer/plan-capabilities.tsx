"use client";

import * as React from "react";

import type { PlanCapabilities } from "@/lib/types/plans";

const Ctx = React.createContext<PlanCapabilities | null>(null);

export function PlanCapabilitiesProvider({
  value,
  children,
}: {
  value: PlanCapabilities;
  children: React.ReactNode;
}) {
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/** Capacidades del plan del entrenador. Disponible en todo el panel
 *  (/entrenador/*) porque el layout monta el provider. */
export function usePlanCapabilities(): PlanCapabilities {
  const v = React.useContext(Ctx);
  if (!v) {
    throw new Error("usePlanCapabilities debe usarse dentro de <PlanCapabilitiesProvider>");
  }
  return v;
}
