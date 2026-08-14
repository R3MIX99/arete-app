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
      offset={isMobile ? { bottom: 88 } : undefined}
      className="toaster group"
      icons={{
        success: <CheckCircle2 className="size-[18px] text-success" />,
        error: <XCircle className="size-[18px] text-destructive" />,
      }}
      toastOptions={{
        unstyled: false,
        classNames: {
          toast: "!rounded-full !w-fit !px-4 !py-3 !gap-2.5 !shadow-lg",
          title: "!text-sm !font-medium",
          icon: "!m-0",
        },
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
