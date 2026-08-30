import { UserX } from "lucide-react";

/**
 * Aviso que reemplaza el contenido de Inicio, Agenda y Nutrición cuando
 * el entrenador desactiva al cliente (perfil -> "Desactivar cliente").
 * El Historial se deja fuera a propósito: sigue viéndose normal, es
 * información pasada del cliente y no depende de que el entrenador lo
 * esté atendiendo ahora mismo. No se borra nada de la base — solo se
 * oculta la rutina/plan/agenda "en vivo" mientras dure la desactivación,
 * y vuelve a verse todo normal si el entrenador lo reactiva.
 */
export function ClientDeactivatedNotice({
  description = "Por ahora tu entrenador no tiene esta sección activa para ti. Contáctalo si crees que es un error.",
}: {
  description?: string;
}) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
      <div className="flex size-14 items-center justify-center rounded-full bg-warning/14 text-warning">
        <UserX className="size-6" />
      </div>
      <h1 className="text-lg font-semibold">Tu entrenador te desactivó</h1>
      <p className="max-w-xs text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
