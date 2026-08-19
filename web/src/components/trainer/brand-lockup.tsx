import { cn } from "@/lib/utils";

/**
 * Logo del encabezado (barra lateral / menú móvil): si el entrenador
 * puso su propio logo de negocio, ese — igual que antes. Si no, en vez
 * del ícono genérico + la palabra "Aretia" en texto suelto, se usa el
 * lockup ya armado (ícono + wordmark), negro en tema claro y blanco en
 * tema oscuro vía dark:/hidden — mismo mecanismo que el resto del tema.
 */
export function BrandLockup({
  brandName,
  brandLogoUrl,
  className,
}: {
  brandName: string;
  brandLogoUrl: string | null;
  className?: string;
}) {
  if (brandLogoUrl) {
    return (
      <div className={cn("flex min-w-0 items-center gap-2.5", className)}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={brandLogoUrl} alt="" className="size-8 shrink-0 rounded-lg object-cover" />
        <span className="truncate text-sm font-semibold tracking-tight">{brandName}</span>
      </div>
    );
  }

  return (
    <div className={cn("flex min-w-0 items-center", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/aretia-wordmark-black.png" alt="Aretia" className="h-6 w-auto dark:hidden" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/aretia-wordmark-white.png" alt="Aretia" className="hidden h-6 w-auto dark:block" />
    </div>
  );
}
