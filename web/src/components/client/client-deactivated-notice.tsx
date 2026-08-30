import { UserX } from "lucide-react";

/**
 * Pantalla que ve el cliente en vez de su rutina/agenda/nutrición cuando
 * su entrenador lo desactiva (perfil -> "Desactivar cliente"). No se
 * borra nada de su historial ni de sus asignaciones — solo se le corta
 * el acceso mientras dure la desactivación, y vuelve a ver todo normal
 * si el entrenador lo reactiva.
 */
export function ClientDeactivatedNotice() {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
      <div className="flex size-14 items-center justify-center rounded-full bg-warning/14 text-warning">
        <UserX className="size-6" />
      </div>
      <h1 className="text-lg font-semibold">Tu entrenador te desactivó</h1>
      <p className="max-w-xs text-sm text-muted-foreground">
        Por ahora no puedes ver tu rutina, plan nutricional ni registrar
        entrenamientos. Tu historial y tu progreso siguen guardados —
        contacta a tu entrenador si crees que es un error.
      </p>
    </div>
  );
}
