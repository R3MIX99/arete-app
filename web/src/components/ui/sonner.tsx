"use client";

import type { CSSProperties } from "react";
import { useTheme } from "next-themes";
import { CheckCircle2, XCircle } from "lucide-react";
import { Toaster as Sonner, type ToasterProps } from "sonner";

import { useIsMobile } from "@/lib/hooks/use-is-mobile";

/**
 * En teléfono los toasts salen abajo (arriba de la barra de navegación
 * flotante del panel de cliente / la barra inferior del entrenador) en
 * vez de arriba, con forma de píldora — mismo lenguaje visual que la
 * nav — y solo el ícono de check se colorea según el resultado (verde
 * éxito, rojo error), no todo el fondo del toast.
 */
const Toaster = ({ ...props }: ToasterProps) => {
  const { resolvedTheme } = useTheme();
  const isMobile = useIsMobile();

  return (
    <Sonner
      theme={resolvedTheme as ToasterProps["theme"]}
      position={isMobile ? "bottom-center" : "top-right"}
      // La nav inferior flotante mide ~64px + su propio margen, más lo
      // que agregue el "home indicator" del teléfono (safe-area-inset) —
      // sin sumar eso, en algunos teléfonos el toast quedaba justo
      // encima del borde y se veía pegado/tapando la barra.
      offset={isMobile ? { bottom: "calc(108px + env(safe-area-inset-bottom))" } : undefined}
      className="toaster group"
      icons={{
        success: <CheckCircle2 className="size-[18px] text-success" />,
        error: <XCircle className="size-[18px] text-destructive" />,
      }}
      toastOptions={{
        unstyled: false,
        classNames: {
          toast: "!rounded-full !px-4 !py-3 !gap-2.5 !shadow-lg !justify-center",
          title: "!text-sm !font-medium !text-center",
          icon: "!m-0",
        },
        // Sonner posiciona cada toast en móvil con left:0 + right:0 +
        // un width ya calculado para que su propio cálculo dé una caja
        // centrada — pero de ANCHO COMPLETO. Forzarle un ancho propio
        // por clase (w-fit) no funcionaba: con left, width Y right los
        // tres fijos a la vez, la caja queda anclada a la izquierda e
        // ignora el "right" (así lo define la propia especificación de
        // CSS). Por eso aquí se resuelve por estilo en línea (solo en
        // móvil — en escritorio sonner ya ancla bien a la derecha) —
        // que sí gana sobre las reglas de sonner por no llevar
        // !important — y se centra con `translate` (una propiedad CSS
        // aparte de `transform`, que sonner ya usa para la animación de
        // entrada/salida) para no pisarle esa animación.
        style: isMobile
          ? ({
              left: "50%",
              right: "auto",
              width: "fit-content",
              maxWidth: "92vw",
              translate: "-50% 0",
            } as CSSProperties)
          : undefined,
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
        } as CSSProperties
      }
      {...props}
    />
  );
};

export { Toaster };
