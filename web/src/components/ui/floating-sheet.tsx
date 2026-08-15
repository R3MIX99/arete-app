"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { XIcon } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Variante "flotante" del Sheet — no toca los bordes de la pantalla
 * (espacio arriba, a la derecha y abajo), esquinas redondeadas, con
 * slide-in desde la derecha / slide-out hacia la derecha. Pensada para
 * paneles de detalle en escritorio (p. ej. el historial de una rutina
 * o de un ejercicio) que antes eran su propia página y se sentían
 * "aisladas".
 */
const FloatingSheet = DialogPrimitive.Root;
const FloatingSheetTrigger = DialogPrimitive.Trigger;
const FloatingSheetClose = DialogPrimitive.Close;

function FloatingSheetContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content>) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay
        className={cn(
          "fixed inset-0 z-50 bg-black/40",
          "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
        )}
      />
      <DialogPrimitive.Content
        data-slot="floating-sheet-content"
        className={cn(
          "fixed inset-y-4 right-4 z-50 flex w-full max-w-lg flex-col overflow-hidden rounded-2xl border bg-popover text-popover-foreground shadow-2xl outline-none",
          "data-[state=open]:animate-in data-[state=closed]:animate-out",
          "data-[state=open]:slide-in-from-right data-[state=closed]:slide-out-to-right",
          "data-[state=open]:duration-300 data-[state=closed]:duration-200 data-[state=open]:ease-out data-[state=closed]:ease-in",
          className,
        )}
        {...props}
      >
        {children}
        <DialogPrimitive.Close className="ring-offset-background focus:ring-ring absolute top-4 right-4 rounded-full p-1.5 text-muted-foreground opacity-80 transition-opacity hover:bg-accent hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden">
          <XIcon className="size-4" />
          <span className="sr-only">Cerrar</span>
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

function FloatingSheetHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="floating-sheet-header"
      className={cn("flex flex-col gap-1 border-b px-5 py-4 pr-12", className)}
      {...props}
    />
  );
}

function FloatingSheetTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      data-slot="floating-sheet-title"
      className={cn("truncate text-base font-semibold", className)}
      {...props}
    />
  );
}

function FloatingSheetDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      data-slot="floating-sheet-description"
      className={cn("truncate text-sm text-muted-foreground", className)}
      {...props}
    />
  );
}

function FloatingSheetBody({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="floating-sheet-body"
      className={cn("flex-1 overflow-y-auto p-5", className)}
      {...props}
    />
  );
}

export {
  FloatingSheet,
  FloatingSheetTrigger,
  FloatingSheetClose,
  FloatingSheetContent,
  FloatingSheetHeader,
  FloatingSheetTitle,
  FloatingSheetDescription,
  FloatingSheetBody,
};
