"use client";

import * as React from "react";

import type { GymContext } from "@/lib/types/gym-context";

const Ctx = React.createContext<GymContext | null>(null);

export function GymContextProvider({
  value,
  children,
}: {
  value: GymContext | null;
  children: React.ReactNode;
}) {
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/** null si el entrenador no pertenece a ningún gimnasio — a diferencia
 *  de usePlanCapabilities() esto es un caso normal, no un error: la
 *  mayoría de los entrenadores independientes nunca tendrán gimnasio. */
export function useGymContext(): GymContext | null {
  return React.useContext(Ctx);
}
