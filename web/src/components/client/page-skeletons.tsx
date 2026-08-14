import { Skeleton } from "@/components/ui/skeleton";

/**
 * Skeletons de página completa para los `loading.tsx` del panel de
 * cliente — mismo patrón que `trainer/page-skeletons.tsx`: Next.js los
 * muestra de inmediato al cambiar de pestaña mientras el Server
 * Component de la página carga sus datos, calcados a la forma real de
 * cada pantalla para que no "brinque" al terminar de cargar.
 */

/** /cliente (Inicio): saludo + tarjeta de la sesión de hoy. */
export function ClientHomeSkeleton() {
  return (
    <div className="mx-auto flex max-w-md flex-col gap-5 p-4 pb-24">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-6 w-52" />
      </div>
      <div className="flex flex-col gap-3">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="glass-card flex items-center gap-3 rounded-xl p-4">
            <Skeleton className="size-11 shrink-0 rounded-xl" />
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-20" />
            </div>
            <Skeleton className="h-8 w-20 shrink-0 rounded-md" />
          </div>
        ))}
      </div>
      <Skeleton className="mx-auto h-4 w-44" />
    </div>
  );
}

/** /cliente/agenda: botón de mes + navegador de día + tarjetas de sesión. */
export function ClientAgendaSkeleton() {
  return (
    <div className="mx-auto flex max-w-md flex-col gap-4 p-4 pb-24">
      <Skeleton className="h-7 w-20" />
      <div className="flex items-center gap-2">
        <Skeleton className="h-9 w-32 rounded-md" />
      </div>
      <div className="flex items-center justify-between">
        <Skeleton className="size-9 rounded-md" />
        <Skeleton className="h-4 w-36" />
        <Skeleton className="size-9 rounded-md" />
      </div>
      <div className="flex flex-col gap-2.5">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="glass-card flex items-center gap-3 rounded-xl p-4">
            <Skeleton className="size-10 shrink-0 rounded-xl" />
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-3 w-24" />
            </div>
            <Skeleton className="h-8 w-20 shrink-0 rounded-md" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** /cliente/entrenamiento (Historial): título + pestañas + lista. */
export function ClientTrainingSkeleton() {
  return (
    <div className="mx-auto flex max-w-md flex-col gap-4 p-4 pb-24">
      <Skeleton className="h-7 w-24" />
      <Skeleton className="h-10 w-full rounded-lg" />
      <div className="flex flex-col gap-2.5">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="glass-card flex items-center gap-3 rounded-xl p-4">
            <Skeleton className="size-10 shrink-0 rounded-xl" />
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** /cliente/nutricion, /cliente/perfil: pantallas stub simples. */
export function ClientSimplePageSkeleton() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-3 p-10 text-center">
      <Skeleton className="size-14 rounded-2xl" />
      <Skeleton className="h-4 w-40" />
      <Skeleton className="h-3 w-56" />
    </div>
  );
}

/** /cliente/entrenamiento/sesion: encabezado + bloques de ejercicio. */
export function ClientSessionSkeleton() {
  return (
    <div className="mx-auto flex max-w-md flex-col gap-3 pb-24">
      <div className="flex items-center gap-3 border-b px-4 py-3">
        <Skeleton className="size-9 shrink-0 rounded-md" />
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3 w-28" />
        </div>
      </div>
      <div className="flex flex-col gap-3 px-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="glass-card flex items-center gap-3 rounded-xl p-4">
            <Skeleton className="size-8 shrink-0 rounded-full" />
            <Skeleton className="h-4 w-40" />
          </div>
        ))}
      </div>
      <div className="px-4">
        <Skeleton className="h-11 w-full rounded-md" />
      </div>
    </div>
  );
}
