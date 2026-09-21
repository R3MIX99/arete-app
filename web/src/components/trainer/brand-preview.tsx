"use client";

import { ChevronRight } from "lucide-react";

import { brandInlineStyle } from "@/lib/brand-color";
import { outfit } from "@/lib/fonts";
import { cn } from "@/lib/utils";
import { brandingOf, ClientBrandBlock } from "@/components/client/client-brand-block";

/** Vista previa de cómo verán tus clientes la marca en su app: saludo, logo,
 * nombre, subtítulo y el color de acento en un botón, un ícono y un chip.
 * Usa el mismo bloque de marca que el inicio del cliente, así que lo que se
 * ve aquí es lo que se ve allá. */
export function BrandPreview({
  businessName,
  tagline,
  logoUrl,
  color,
  trainerName,
  className,
}: {
  businessName: string;
  tagline: string;
  logoUrl: string | null;
  color: string;
  trainerName: string;
  className?: string;
}) {
  // Misma regla que el inicio del cliente: sin nombre ni logo propios no
  // hay bloque de marca.
  const branding = brandingOf({ name: businessName, fallbackName: trainerName, logoUrl, tagline });

  return (
    <div
      style={brandInlineStyle(color)}
      className={cn(
        outfit.className,
        "relative isolate mx-auto w-full max-w-xs overflow-hidden rounded-3xl border bg-background p-5 text-foreground",
        className,
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-40 bg-[radial-gradient(ellipse_75%_100%_at_100%_0%,color-mix(in_oklab,var(--primary)_34%,transparent),transparent)]"
      />
      <p className="text-2xl leading-tight font-medium">
        Hola, <span className="text-primary">Sofía</span>!
      </p>
      <p className="mt-0.5 text-sm text-muted-foreground">Tu entrenamiento de hoy</p>

      {branding ? (
        <div className="mt-4">
          <ClientBrandBlock branding={branding} />
        </div>
      ) : null}

      <div className="mt-5 flex items-center justify-between gap-3 rounded-2xl bg-card p-3">
        <div className="min-w-0">
          <p className="text-sm leading-snug font-bold">Push</p>
          <p className="text-xs text-muted-foreground">Programa de prueba</p>
        </div>
        <span className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-primary py-1 pr-1.5 pl-2.5 text-xs font-semibold text-primary-foreground">
          Comenzar
          <ChevronRight className="size-3.5" />
        </span>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <span className="rounded-md bg-primary/10 px-2 py-0.5 text-xs text-primary tabular-nums">
          463 kcal - 26g prot
        </span>
        <span aria-hidden className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
          <span className="block h-full w-2/3 rounded-full bg-primary" />
        </span>
      </div>
    </div>
  );
}
