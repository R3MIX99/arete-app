"use client";

import * as React from "react";

export interface ClientProfileInfo {
  name: string;
  /** Foto de perfil, si la hay (la del perfil o la de la cuenta de Google). */
  avatarUrl: string | null;
}

const ClientProfileContext = React.createContext<ClientProfileInfo>({ name: "", avatarUrl: null });

/** El layout del cliente lee el perfil una vez y lo comparte, para que el
 * encabezado del inicio y la barra de las demás pantallas muestren el mismo
 * avatar sin repetir la consulta. */
export function ClientProfileProvider({
  value,
  children,
}: {
  value: ClientProfileInfo;
  children: React.ReactNode;
}) {
  return <ClientProfileContext.Provider value={value}>{children}</ClientProfileContext.Provider>;
}

export function useClientProfile(): ClientProfileInfo {
  return React.useContext(ClientProfileContext);
}
