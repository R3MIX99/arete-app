import { Skeleton } from "@/components/ui/skeleton";

/**
 * Skeletons de página completa para los `loading.tsx` de cada módulo —
 * Next.js los muestra de inmediato al navegar mientras el Server
 * Component de la página carga sus datos, para que el cambio de
 * pestaña/página se sienta instantáneo en vez de quedarse "trabado".
 */

export function GridPageSkeleton({ cards = 8 }: { cards?: number }) {
  return (
    <div className="flex w-full flex-col gap-6 p-4 pb-24 md:p-8">
      <div className="flex flex-wrap items-center gap-3">
        <Skeleton className="h-9 w-full max-w-xs" />
        <Skeleton className="h-9 w-9 shrink-0" />
        <Skeleton className="ml-auto hidden h-9 w-36 md:block" />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
        {Array.from({ length: cards }).map((_, i) => (
          <div key={i} className="flex flex-col gap-0 overflow-hidden rounded-xl border">
            <Skeleton className="aspect-[4/3] w-full rounded-none" />
            <div className="flex flex-col gap-2 px-3 py-2.5">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-4 w-24" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function DetailPageSkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 p-4 md:p-8">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-40 w-full rounded-xl" />
      <Skeleton className="h-24 w-full rounded-xl" />
      <Skeleton className="h-24 w-full rounded-xl" />
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="flex w-full flex-col gap-8 p-4 md:p-8">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full rounded-xl" />
        ))}
      </div>
      <div className="flex gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-36" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Skeleton className="h-48 w-full rounded-xl" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    </div>
  );
}

export function CalendarPageSkeleton() {
  return (
    <div className="flex w-full flex-col gap-4 p-4 pb-24 md:p-8">
      <Skeleton className="h-9 w-full max-w-40" />
      <div className="flex flex-col gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}
