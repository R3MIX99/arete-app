import { Apple } from "lucide-react";

export default function ClientNutritionPage() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-3 p-10 text-center">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <Apple className="size-6" />
      </div>
      <p className="font-medium">Nutrición — Próximamente</p>
      <p className="text-sm text-muted-foreground">
        Aquí verás tu plan nutricional, comidas del día y sustitutos de alimentos.
      </p>
    </div>
  );
}
