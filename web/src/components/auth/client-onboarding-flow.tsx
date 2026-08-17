"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Dumbbell, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import { GenderPicker } from "@/components/auth/gender-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const TOTAL_STEPS = 3;

const FREQUENCY_OPTIONS: { value: number; label: string }[] = [
  { value: 1, label: "1-2 por semana" },
  { value: 3, label: "3-4 por semana" },
  { value: 5, label: "5-6 por semana" },
  { value: 7, label: "Todos los días" },
];

/**
 * Onboarding de un cliente recién aceptó su invitación: bienvenida,
 * cómo se llama y su género, y datos físicos (estatura y frecuencia de
 * entrenamiento aprox.) que hoy faltan en su perfil. Al terminar marca
 * `onboarding_completed_at` y entra a su panel, donde ya lo esperan la
 * rutina y el plan que le asignó su entrenador.
 */
export function ClientOnboardingFlow({
  userId,
  initialFullName,
  initialGender,
  initialHeightCm,
  initialWeeklyFrequency,
}: {
  userId: string;
  initialFullName: string;
  initialGender: string;
  initialHeightCm: number | null;
  initialWeeklyFrequency: number | null;
}) {
  const router = useRouter();
  const supabase = React.useMemo(() => createClient(), []);

  const [step, setStep] = React.useState(1);
  const [fullName, setFullName] = React.useState(initialFullName);
  const [gender, setGender] = React.useState(initialGender);
  const [heightCm, setHeightCm] = React.useState(
    initialHeightCm != null ? String(initialHeightCm) : "",
  );
  const [frequency, setFrequency] = React.useState<number | null>(initialWeeklyFrequency);
  const [saving, setSaving] = React.useState(false);

  const parsedHeight = Number(heightCm);
  const heightValid = heightCm.trim() !== "" && parsedHeight > 0;

  async function finish() {
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: fullName.trim(),
        gender,
        height_cm: heightValid ? parsedHeight : null,
        weekly_training_frequency: frequency,
        onboarding_completed_at: new Date().toISOString(),
      })
      .eq("id", userId);
    setSaving(false);
    if (error) {
      toast.error("No se pudo guardar tu perfil. Intenta de nuevo.");
      return;
    }
    router.replace("/cliente");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <div className="flex size-11 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Dumbbell className="size-5" />
          </div>
          <div>
            <h1 className="text-lg font-semibold">Areté</h1>
            <p className="text-sm text-muted-foreground">Paso {step} de {TOTAL_STEPS}</p>
          </div>
        </div>

        {step === 1 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-4 py-8 text-center">
              <div className="flex size-14 items-center justify-center rounded-full bg-primary/12 text-primary">
                <Sparkles className="size-6" />
              </div>
              <div>
                <p className="text-lg font-semibold">¡Bienvenido a Areté!</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Tu entrenador ya te dejó lista tu rutina y tu plan. Antes de entrar, unos
                  datos rápidos.
                </p>
              </div>
              <Button className="w-full" onClick={() => setStep(2)}>
                Comenzar
              </Button>
            </CardContent>
          </Card>
        ) : step === 2 ? (
          <Card>
            <CardHeader>
              <CardTitle>Cuéntanos de ti</CardTitle>
              <CardDescription>Así te vamos a llamar dentro de la app.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="full_name">Nombre</Label>
                <Input
                  id="full_name"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Género</Label>
                <GenderPicker value={gender} onChange={setGender} />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setStep(1)}>
                  Atrás
                </Button>
                <Button
                  className="flex-1"
                  disabled={!fullName.trim()}
                  onClick={() => setStep(3)}
                >
                  Siguiente
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Tus datos físicos</CardTitle>
              <CardDescription>
                Le ayudan a tu entrenador a ajustar mejor tu plan.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="height_cm">Estatura (cm)</Label>
                <Input
                  id="height_cm"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  value={heightCm}
                  onChange={(e) => setHeightCm(e.target.value)}
                  placeholder="Ej. 170"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>¿Cuántas veces por semana entrenas, más o menos?</Label>
                <div className="grid grid-cols-2 gap-2">
                  {FREQUENCY_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setFrequency(option.value)}
                      className={cn(
                        "rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
                        frequency === option.value
                          ? "border-primary bg-primary/10 text-foreground"
                          : "text-muted-foreground hover:bg-accent",
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setStep(2)}>
                  Atrás
                </Button>
                <Button className="flex-1" disabled={saving} onClick={finish}>
                  {saving ? <Loader2 className="animate-spin" /> : null}
                  Terminar
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
