import { ClientProfileMenu } from "@/components/client/client-profile-menu";

/** Encabezado del inicio del cliente: saludo grande con su nombre en el
 * color de acento, y su foto de perfil a la derecha (abre el menú). Un
 * degradado suave del color de acento se asoma desde la esquina superior
 * derecha. */
export function ClientHomeHeader({ firstName }: { firstName: string }) {
  return (
    <header className="relative isolate flex items-start justify-between gap-4 pt-6">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-6 -right-5 -left-5 -z-10 h-56 bg-[radial-gradient(ellipse_75%_100%_at_100%_0%,color-mix(in_oklab,var(--primary)_34%,transparent),transparent)]"
      />
      <div className="min-w-0">
        <h1 className="text-[28px] leading-tight font-medium">
          Hola{firstName ? ", " : ""}
          {firstName ? <span className="text-primary">{firstName}</span> : null}!
        </h1>
        <p className="mt-0.5 text-sm text-muted-foreground">Tu entrenamiento de hoy</p>
      </div>
      <ClientProfileMenu className="shrink-0" />
    </header>
  );
}
