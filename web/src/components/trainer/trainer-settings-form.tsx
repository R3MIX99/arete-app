"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, Sparkles } from "lucide-react";
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

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-5 p-4 md:p-8">
      <Card>
        <CardHeader>
          <CardTitle>Perfil</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>

            <Separator />

            <p className="text-sm font-semibold">Negocio</p>
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Notificaciones</CardTitle>
          {savingNotifications && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
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
  );
}
