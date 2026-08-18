"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Building2, Loader2, Sparkles, Upload } from "lucide-react";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import { compressImage } from "@/lib/image-compress";
import { GenderPicker } from "@/components/auth/gender-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

const TOTAL_STEPS = 3;

/**
 * Onboarding de un entrenador recién registrado: bienvenida, cómo se
 * llama y su género, y los datos de su negocio (nombre + logo, ambos
 * opcionales — si no los pone, sus clientes ven el logo de Aretia). Al
 * terminar marca `onboarding_completed_at` y entra al panel.
 */
export function TrainerOnboardingFlow({
  userId,
  initialFullName,
  initialGender,
  initialBusinessName,
  initialBusinessLogoPath,
}: {
  userId: string;
  initialFullName: string;
  initialGender: string;
  initialBusinessName: string | null;
  initialBusinessLogoPath: string | null;
}) {
  const router = useRouter();
  const supabase = React.useMemo(() => createClient(), []);

  const [step, setStep] = React.useState(1);
  const [fullName, setFullName] = React.useState(initialFullName);
  const [gender, setGender] = React.useState(initialGender);
  const [businessName, setBusinessName] = React.useState(initialBusinessName ?? "");
  const [logoPath, setLogoPath] = React.useState(initialBusinessLogoPath);
  const [uploadingLogo, setUploadingLogo] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const logoInputRef = React.useRef<HTMLInputElement>(null);

  const logoUrl = logoPath
    ? supabase.storage.from("business-logos").getPublicUrl(logoPath).data.publicUrl
    : null;

  async function handleLogoSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setUploadingLogo(true);
    const compressed = await compressImage(file, { maxDimension: 512 });
    const path = `${userId}/logo-${Date.now()}.jpg`;
    const { error } = await supabase.storage
      .from("business-logos")
      .upload(path, compressed, { upsert: true, contentType: "image/jpeg" });
    setUploadingLogo(false);
    if (error) {
      toast.error("No se pudo subir el logo");
      return;
    }
    setLogoPath(path);
  }

  async function finish() {
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: fullName.trim(),
        gender,
        business_name: businessName.trim() || null,
        business_logo_path: logoPath,
        onboarding_completed_at: new Date().toISOString(),
      })
      .eq("id", userId);
    setSaving(false);
    if (error) {
      toast.error("No se pudo guardar tu perfil. Intenta de nuevo.");
      return;
    }
    router.replace("/entrenador");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/aretia-logo.png" alt="Aretia" className="h-14 w-auto" />
          <p className="text-sm text-muted-foreground">
            Paso {step} de {TOTAL_STEPS}
          </p>
        </div>

        {step === 1 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-4 py-8 text-center">
              <div className="flex size-14 items-center justify-center rounded-full bg-primary/12 text-primary">
                <Sparkles className="size-6" />
              </div>
              <div>
                <p className="text-lg font-semibold">¡Bienvenido a Aretia!</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  En un par de pasos dejamos tu cuenta lista para que empieces a armar rutinas
                  y planes para tus clientes.
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
                <Label htmlFor="full_name">Nombre o cómo quieres que te conozcan</Label>
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
              <CardTitle>Tu negocio</CardTitle>
              <CardDescription>
                Opcional — así lo ven tus clientes dentro de la app. Puedes cambiarlo después.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex items-center gap-4">
                <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border bg-foreground/[0.03]">
                  {logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={logoUrl} alt="" className="size-full object-cover" />
                  ) : (
                    <Building2 className="size-6 text-muted-foreground" />
                  )}
                </div>
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleLogoSelected}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={uploadingLogo}
                  onClick={() => logoInputRef.current?.click()}
                >
                  {uploadingLogo ? <Loader2 className="animate-spin" /> : <Upload />}
                  {logoUrl ? "Cambiar logo" : "Subir logo"}
                </Button>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="business_name">Nombre del gimnasio o marca personal</Label>
                <Input
                  id="business_name"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="Si lo dejas vacío, tus clientes ven el logo de Aretia"
                />
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
