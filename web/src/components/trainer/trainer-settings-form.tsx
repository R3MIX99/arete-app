"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Building2, Loader2, Sparkles, Upload, X } from "lucide-react";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import {
  subscriptionPlanLabels,
  subscriptionStatusLabels,
  subscriptionStatusVariants,
  type TrainerSettings,
} from "@/lib/types/settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";

export function TrainerSettingsForm({ settings }: { settings: TrainerSettings }) {
  const router = useRouter();
  const [fullName, setFullName] = React.useState(settings.full_name);
  const [phone, setPhone] = React.useState(settings.phone ?? "");
  const [businessName, setBusinessName] = React.useState(settings.business_name ?? "");
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [notifyEmail, setNotifyEmail] = React.useState(settings.notify_email);
  const [notifyPush, setNotifyPush] = React.useState(settings.notify_push);
  const [savingNotifications, setSavingNotifications] = React.useState(false);

  const [uploadingLogo, setUploadingLogo] = React.useState(false);
  const logoInputRef = React.useRef<HTMLInputElement>(null);
  const logoUrl = settings.business_logo_path
    ? createClient().storage.from("business-logos").getPublicUrl(settings.business_logo_path)
        .data.publicUrl
    : null;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        full_name: fullName,
        phone: phone || null,
        business_name: businessName || null,
      })
      .eq("id", settings.id);

    setSaving(false);
    if (updateError) {
      setError("No se pudieron guardar los cambios. Intenta de nuevo.");
      toast.error("No se pudieron guardar los cambios");
      return;
    }

    toast.success("Cambios guardados");
    router.refresh();
  }

  async function updateNotifications(next: { notifyEmail: boolean; notifyPush: boolean }) {
    setSavingNotifications(true);
    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ notify_email: next.notifyEmail, notify_push: next.notifyPush })
      .eq("id", settings.id);
    setSavingNotifications(false);
    if (updateError) {
      toast.error("No se pudieron guardar las notificaciones");
      return;
    }
    router.refresh();
  }

  async function handleLogoSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setUploadingLogo(true);
    const supabase = createClient();
    const extension = file.name.includes(".") ? file.name.split(".").pop() : "png";
    const path = `${settings.id}/logo-${Date.now()}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from("business-logos")
      .upload(path, file, { upsert: true });
    if (uploadError) {
      setUploadingLogo(false);
      toast.error("No se pudo subir el logo");
      return;
    }

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ business_logo_path: path })
      .eq("id", settings.id);
    setUploadingLogo(false);
    if (updateError) {
      toast.error("No se pudo guardar el logo");
      return;
    }

    toast.success("Logo actualizado");
    router.refresh();
  }

  async function handleRemoveLogo() {
    setUploadingLogo(true);
    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ business_logo_path: null })
      .eq("id", settings.id);
    setUploadingLogo(false);
    if (updateError) {
      toast.error("No se pudo quitar el logo");
      return;
    }
    toast.success("Logo eliminado");
    router.refresh();
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-5 p-4 md:p-8">
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 md:items-start">
          <Card>
            <CardHeader>
              <CardTitle>Perfil</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="full_name">Nombre completo</Label>
                <Input
                  id="full_name"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="email">Correo electrónico</Label>
                <Input id="email" value={settings.email} disabled />
                <p className="text-xs text-muted-foreground">
                  El correo no se puede cambiar desde aquí.
                </p>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="phone">Teléfono (opcional)</Label>
                <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Negocio</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex items-center gap-4">
                <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border bg-foreground/[0.03]">
                  {logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={logoUrl} alt="Logo del negocio" className="size-full object-cover" />
                  ) : (
                    <Building2 className="size-6 text-muted-foreground" />
                  )}
                </div>
                <div className="flex flex-col gap-1.5">
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleLogoSelected}
                  />
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={uploadingLogo}
                      onClick={() => logoInputRef.current?.click()}
                    >
                      {uploadingLogo ? (
                        <Loader2 className="animate-spin" />
                      ) : (
                        <Upload />
                      )}
                      {logoUrl ? "Cambiar logo" : "Subir logo"}
                    </Button>
                    {logoUrl && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={uploadingLogo}
                        className="text-destructive hover:text-destructive"
                        onClick={handleRemoveLogo}
                      >
                        <X /> Quitar
                      </Button>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Opcional. Si no subes uno, tus clientes ven el logo de Areté.
                  </p>
                </div>
              </div>

              <Separator />

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="business_name">
                  Nombre del gimnasio o marca personal (opcional)
                </Label>
                <Input
                  id="business_name"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}

        <Button type="submit" disabled={saving} className="w-fit">
          {saving ? <Loader2 className="animate-spin" /> : null}
          Guardar cambios
        </Button>
      </form>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 md:items-start">
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Notificaciones</CardTitle>
            {savingNotifications && (
              <Loader2 className="size-4 animate-spin text-muted-foreground" />
            )}
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium">Correo electrónico</p>
                <p className="text-xs text-muted-foreground">
                  Avisos de clientes nuevos, mensajes y recordatorios.
                </p>
              </div>
              <Switch
                checked={notifyEmail}
                disabled={savingNotifications}
                onCheckedChange={(checked) => {
                  setNotifyEmail(checked);
                  void updateNotifications({ notifyEmail: checked, notifyPush });
                }}
              />
            </div>
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium">Notificaciones push</p>
                <p className="text-xs text-muted-foreground">
                  Avisos en tiempo real dentro de la app.
                </p>
              </div>
              <Switch
                checked={notifyPush}
                disabled={savingNotifications}
                onCheckedChange={(checked) => {
                  setNotifyPush(checked);
                  void updateNotifications({ notifyEmail, notifyPush: checked });
                }}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Plan de suscripción</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-full bg-primary/12 text-primary">
                <Sparkles className="size-[18px]" />
              </div>
              <div>
                <p className="text-sm font-semibold">
                  Plan {subscriptionPlanLabels[settings.subscription_plan]}
                </p>
                <Badge variant={subscriptionStatusVariants[settings.subscription_status]}>
                  {subscriptionStatusLabels[settings.subscription_status]}
                </Badge>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              La gestión de planes y pagos todavía no está conectada — vas a poder cambiar de
              plan directamente desde aquí más adelante.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
