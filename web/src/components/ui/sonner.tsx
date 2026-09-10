"use client";

import type { CSSProperties, ReactNode } from "react";
import { useTheme } from "next-themes";
import { Check, CheckCircle2, X, XCircle } from "lucide-react";
import { Toaster as Sonner, type ToasterProps } from "sonner";

import { useIsMobile } from "@/lib/hooks/use-is-mobile";

/**
 * En teléfono los toasts salen abajo (arriba de la barra de navegación
 * flotante del panel de cliente / la barra inferior del entrenador) en
 * vez de arriba, con forma de píldora — mismo lenguaje visual que la
 * nav — y solo el ícono de check se colorea según el resultado (verde
 * éxito, rojo error), no todo el fondo del toast.
 *
 * En computadora es una tarjeta más amplia y limpia: texto más grande a
 * la izquierda y un círculo con el ícono (verde éxito / rojo error) a la
 * derecha.
 */
const Toaster = ({ ...props }: ToasterProps) => {
  const { resolvedTheme } = useTheme();
  const isMobile = useIsMobile();

  const badgeIcon = (icon: ReactNode, tone: "success" | "destructive") => (
    <span
      className={
        tone === "success"
          ? "flex size-7 items-center justify-center rounded-full bg-success/15 text-success"
          : "flex size-7 items-center justify-center rounded-full bg-destructive/15 text-destructive"
      }
    >
      {icon}
    </span>
  );

  return (
    <Sonner
      theme={resolvedTheme as ToasterProps["theme"]}
      position={isMobile ? "bottom-center" : "top-right"}
      // OJO: en móvil sonner NO usa `offset` — su CSS para pantallas
      // angostas lee otra variable distinta, la que alimenta esta prop
      // `mobileOffset`. Por eso los intentos anteriores de separarlo de
      // la barra vía `offset` no movían nada y el toast seguía saliendo
      // encima de la navegación.
      // La nav inferior flotante mide ~64px + su margen, más lo que
      // agregue el "home indicator" del teléfono (safe-area-inset).
      mobileOffset={{ bottom: "calc(84px + env(safe-area-inset-bottom))", left: "16px", right: "16px" }}
      // En móvil sonner deja el contenedor con left/right propios pero
      // width:100%, así que se desborda por la derecha y el "centro"
      // del contenedor no coincide con el centro real de la pantalla.
      // Se neutraliza para que el centrado del toast sí quede parejo.
      className="toaster group max-md:!left-0 max-md:!right-0 max-md:!w-auto"
      icons={{
        success: isMobile ? (
          <CheckCircle2 className="size-[18px] text-success" />
        ) : (
          badgeIcon(<Check className="size-3.5" strokeWidth={3} />, "success")
        ),
        error: isMobile ? (
          <XCircle className="size-[18px] text-destructive" />
        ) : (
          badgeIcon(<X className="size-3.5" strokeWidth={3} />, "destructive")
        ),
      }}
      toastOptions={{
        unstyled: false,
        classNames: isMobile
          ? {
              toast: "!rounded-full !px-4 !py-3 !gap-2.5 !shadow-lg !justify-center",
              title: "!text-sm !font-medium !text-center",
              icon: "!m-0",
            }
          : {
              // Ancho al contenido (se fija por style en línea, más
              // abajo); ícono a la derecha (flex-row-reverse). pr mayor
              // que pl para que el círculo no quede pegado al borde, y
              // poco padding vertical.
              toast:
                "!rounded-2xl !py-2.5 !pl-5 !pr-6 !gap-3 !shadow-lg !flex-row-reverse",
              title: "!text-[15px] !font-semibold",
              description: "!text-xs !text-muted-foreground",
              // Sonner deja [data-icon] fijo en 16x16 con márgenes raros
              // (-3px / 4px) — el círculo de 28px se salía de esa caja y
              // quedaba pegado al borde. Se fuerza a size-7 sin márgenes.
              icon: "!size-7 !m-0 !justify-center !self-center",
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
              // max-content = el ancho natural del texto sin partirlo;
              // con fit-content el toast se comprimía y el mensaje
              // salía envuelto en varias líneas. El maxWidth lo vuelve
              // a envolver solo si de verdad no cabe en la pantalla.
              width: "max-content",
              maxWidth: "calc(100vw - 32px)",
              translate: "-50% 0",
            } as CSSProperties)
          : // En escritorio, sonner fija width: var(--width) (356px) en
            // línea/por hoja de estilos — se anula aquí para que el toast
            // se ajuste a su contenido en vez de dejar un hueco en blanco.
            ({
              width: "max-content",
              maxWidth: "400px",
            } as CSSProperties),
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
