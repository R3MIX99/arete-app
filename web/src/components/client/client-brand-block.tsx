export interface ClientBranding {
  name: string;
  /** Logo propio del entrenador; sin él se usa la marca de Aretia. */
  logoUrl: string | null;
  tagline: string | null;
}

/** Marca de Aretia, para cuando el entrenador no configuró la suya. */
export const DEFAULT_BRANDING: ClientBranding = {
  name: "Aretia",
  logoUrl: null,
  tagline: "By Codeal.ai",
};

/** Logo, nombre y subtítulo del negocio, debajo del saludo. Muestra la
 * marca que el entrenador configuró (logo, nombre y subtítulo propios) o,
 * si no hay ninguna, la de Aretia. */
export function ClientBrandBlock({ branding }: { branding: ClientBranding }) {
  return (
    <div className="flex items-center gap-4">
      {branding.logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={branding.logoUrl} alt="" className="size-14 shrink-0 rounded-xl object-cover" />
      ) : (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/aretia-icon-black.png" alt="" className="size-14 shrink-0 object-contain dark:hidden" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/aretia-icon-white.png"
            alt=""
            className="hidden size-14 shrink-0 object-contain dark:block"
          />
        </>
      )}
      <div className="min-w-0">
        <p className="truncate text-xl leading-tight font-medium">{branding.name}</p>
        {branding.tagline ? (
          <p className="truncate text-sm text-muted-foreground">{branding.tagline}</p>
        ) : null}
      </div>
    </div>
  );
}
