/** Ícono de Aretia (sin el wordmark) para los encabezados de
 * login/registro/onboarding — cambia solo de color según el tema:
 * negro en claro, blanco en oscuro. Dos <img> fijas conmutadas con
 * dark:/hidden (mismo mecanismo que el resto del tema, vía la clase
 * .dark en <html>) en vez de una sola imagen — así no hace falta JS
 * para saber qué tema está activo ni hay parpadeo al hidratar. */
export function AuthBrandIcon({ className = "h-16 w-auto" }: { className?: string }) {
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/aretia-icon-black.png" alt="Aretia" className={`${className} dark:hidden`} />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/aretia-icon-white.png" alt="Aretia" className={`${className} hidden dark:block`} />
    </>
  );
}
