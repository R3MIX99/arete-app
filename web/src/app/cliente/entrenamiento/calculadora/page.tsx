"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { WeightConverterForm } from "@/components/client/weight-converter-form";

/**
 * Página del convertidor de peso (libras a kilos), como página aparte y
 * no como drawer — con el teclado numérico del teléfono abierto, el
 * drawer empujaba todo el contenido y el layout se rompía. Se llega
 * aquí desde el botón de calculadora junto al historial de cada
 * ejercicio, y router.back() regresa justo a donde estaba.
 */
export default function WeightConverterPage() {
  const router = useRouter();

  return (
    <div className="mx-auto flex max-w-md flex-col gap-4 p-4 pb-10">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="shrink-0" onClick={() => router.back()} aria-label="Regresar">
          <ChevronLeft className="size-5" />
        </Button>
        <p className="truncate font-semibold">Convertidor de peso</p>
      </div>

      <WeightConverterForm />
    </div>
  );
}
