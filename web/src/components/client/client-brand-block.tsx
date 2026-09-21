export interface ClientBranding {
  name: string;
  /** Logo propio del entrenador; sin él va solo el nombre. */
  logoUrl: string | null;
  tagline: string | null;
}

/** Logo, nombre y subtítulo del negocio, debajo del saludo. Solo se dibuja
 * con la marca que el entrenador configuró; sin ella el inicio no muestra
 * este bloque (quien lo usa decide, ver `brandingOf`). Sin logo propio va
 * solo el texto, sin ningún ícono de relleno. */
export function ClientBrandBlock({ branding }: { branding: ClientBranding }) {
  return (
    <div className="flex items-center gap-4">
      {branding.logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={branding.logoUrl} alt="" className="size-14 shrink-0 rounded-xl object-cover" />
      ) : null}
      <div className="min-w-0">
        <p className="truncate text-xl leading-tight font-medium">{branding.name}</p>
        {branding.tagline ? (
          <p className="truncate text-sm text-muted-foreground">{branding.tagline}</p>
        ) : null}
      </div>
    </div>
  );
}

/** Marca a mostrar según lo que puso el entrenador: null si no puso nombre
 * ni logo (entonces no hay bloque de marca). El subtítulo solo cuenta junto
 * a un nombre o un logo. */
export function brandingOf(input: {
  name: string | null | undefined;
  fallbackName: string | null | undefined;
  logoUrl: string | null;
  tagline: string | null | undefined;
}): ClientBranding | null {
  const name = input.name?.trim() || null;
  if (!name && !input.logoUrl) return null;
  return {
    name: name || input.fallbackName?.trim() || "",
    logoUrl: input.logoUrl,
    tagline: input.tagline?.trim() || null,
  };
}
