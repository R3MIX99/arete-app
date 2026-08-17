"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  AlertTriangle,
  Building2,
  ChevronLeft,
  Loader2,
  Mail,
  Phone,
  Sparkles,
  Trash2,
  User,
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { clientGoalLabels, formatDate } from "@/lib/format";
import {
  MEASUREMENT_FIELDS,
  type MeasurementKey,
  type ProgressMeasurement,
} from "@/lib/types/progress";
import { subscriptionPlanLabels } from "@/lib/types/settings";
import type { AssignedTrainer, ClientProfileSettings } from "@/lib/types/client-profile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ProgressLineChart } from "@/components/trainer/progress-line-chart";

const GOAL_OPTIONS = Object.entries(clientGoalLabels);

export function ClientProfileView({
  profile,
  trainer,
  measurements,
}: {
  profile: ClientProfileSettings;
  trainer: AssignedTrainer | null;
  measurements: ProgressMeasurement[];
}) {
  const router = useRouter();
  const supabase = React.useMemo(() => createClient(), []);

  const [fullName, setFullName] = React.useState(profile.full_name);
  const [phone, setPhone] = React.useState(profile.phone ?? "");
  const [goal, setGoal] = React.useState(profile.goal ?? "");
  const [healthNotes, setHealthNotes] = React.useState(profile.health_notes ?? "");
  const [saving, setSaving] = React.useState(false);

  const [workoutReminders, setWorkoutReminders] = React.useState(
    profile.notify_workout_reminders,
  );
  const [mealReminders, setMealReminders] = React.useState(profile.notify_meal_reminders);
  const [savingNotifications, setSavingNotifications] = React.useState(false);

  const [metric, setMetric] = React.useState<MeasurementKey>("weight_kg");
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [requestingDeletion, setRequestingDeletion] = React.useState(false);

  const activeField = MEASUREMENT_FIELDS.find((f) => f.key === metric)!;
  const points = React.useMemo(
    () =>
      measurements
        .filter((m) => m.metric_key === metric)
        .sort((a, b) => a.entry_date.localeCompare(b.entry_date))
        .map((m) => ({ label: formatDate(m.entry_date), value: m.value })),
    [measurements, metric],
  );

  const trainerLogoUrl = trainer?.business_logo_path
    ? supabase.storage.from("business-logos").getPublicUrl(trainer.business_logo_path).data
        .publicUrl
    : null;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: fullName,
        phone: phone.trim() || null,
        goal: goal || null,
        health_notes: healthNotes.trim() || null,
      })
      .eq("id", profile.id);
    setSaving(false);
    if (error) {
      toast.error("No se pudieron guardar los cambios");
      return;
    }
    toast.success("Perfil actualizado");
    router.refresh();
  }

  async function updateNotifications(next: { workout: boolean; meal: boolean }) {
    setSavingNotifications(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        notify_workout_reminders: next.workout,
        notify_meal_reminders: next.meal,
      })
      .eq("id", profile.id);
    setSavingNotifications(false);
    if (error) {
      // Se revierte el switch para no dejarlo mostrando algo que no se
      // llegó a guardar.
      setWorkoutReminders(profile.notify_workout_reminders);
      setMealReminders(profile.notify_meal_reminders);
      toast.error("No se pudieron guardar las notificaciones");
      return;
    }
    router.refresh();
  }

  async function handleRequestDeletion() {
    setRequestingDeletion(true);
    const { error } = await supabase
      .from("profiles")
      .update({ deletion_requested_at: new Date().toISOString() })
      .eq("id", profile.id);
    setRequestingDeletion(false);
    setDeleteOpen(false);
    if (error) {
      toast.error("No se pudo enviar la solicitud");
      return;
    }
    toast.success("Solicitud enviada");
    router.refresh();
  }

  return (
    <div className="mx-auto flex max-w-md flex-col gap-4 p-4 pb-28">
      {/* Ya no es una pestaña de la nav, se llega desde el avatar — por
          eso lleva su propio botón de regreso. */}
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="shrink-0"
          aria-label="Regresar"
          onClick={() => router.back()}
        >
          <ChevronLeft className="size-5" />
        </Button>
        <h1 className="text-xl font-semibold">Configuración</h1>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <User className="size-5" />
        </div>
        <div className="min-w-0">
          <p className="truncate font-medium">{profile.full_name}</p>
          <p className="truncate text-sm text-muted-foreground">{profile.email}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Datos personales</CardTitle>
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
              <Input id="email" value={profile.email} disabled />
              <p className="text-xs text-muted-foreground">
                El correo no se puede cambiar desde aquí.
              </p>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="phone">Teléfono (opcional)</Label>
              <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="goal">Mi objetivo</Label>
              <Select value={goal} onValueChange={setGoal}>
                <SelectTrigger id="goal" className="w-full">
                  <SelectValue placeholder="Sin objetivo definido" />
                </SelectTrigger>
                <SelectContent>
                  {GOAL_OPTIONS.map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="health_notes">Notas de salud (opcional)</Label>
              <Textarea
                id="health_notes"
                rows={3}
                placeholder="Lesiones, alergias, intolerancias…"
                value={healthNotes}
                onChange={(e) => setHealthNotes(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Tu entrenador puede verlas para ajustar tus rutinas y tu plan.
              </p>
            </div>

            <Button type="submit" disabled={saving} className="w-full">
              {saving ? <Loader2 className="animate-spin" /> : null}
              Guardar cambios
            </Button>
          </CardContent>
        </Card>
      </form>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Mi entrenador</CardTitle>
        </CardHeader>
        <CardContent>
          {trainer ? (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <div className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border bg-foreground/[0.03]">
                  {trainerLogoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={trainerLogoUrl} alt="" className="size-full object-cover" />
                  ) : (
                    <Building2 className="size-5 text-muted-foreground" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{trainer.full_name}</p>
                  {trainer.business_name ? (
                    <p className="truncate text-xs text-muted-foreground">
                      {trainer.business_name}
                    </p>
                  ) : null}
                </div>
              </div>

              <Separator />

              <div className="flex flex-col gap-2">
                <a
                  href={`mailto:${trainer.email}`}
                  className="flex items-center gap-2.5 text-sm hover:underline"
                >
                  <Mail className="size-4 shrink-0 text-muted-foreground" />
                  <span className="truncate">{trainer.email}</span>
                </a>
                {trainer.phone ? (
                  <a
                    href={`tel:${trainer.phone}`}
                    className="flex items-center gap-2.5 text-sm hover:underline"
                  >
                    <Phone className="size-4 shrink-0 text-muted-foreground" />
                    <span className="truncate">{trainer.phone}</span>
                  </a>
                ) : null}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Todavía no tienes un entrenador asignado.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="text-sm">Peso y medidas</CardTitle>
          <Select value={metric} onValueChange={(v) => setMetric(v as MeasurementKey)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MEASUREMENT_FIELDS.map((field) => (
                <SelectItem key={field.key} value={field.key}>
                  {field.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          <ProgressLineChart
            points={points}
            unit={activeField.unit}
            emptyMessage="Tu entrenador todavía no ha registrado esta medida."
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="text-sm">Notificaciones</CardTitle>
          {savingNotifications ? (
            <Loader2 className="size-4 animate-spin text-muted-foreground" />
          ) : null}
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm font-medium">Recordatorios de entrenamiento</p>
              <p className="text-xs text-muted-foreground">
                Avisos de las sesiones que tienes agendadas.
              </p>
            </div>
            <Switch
              checked={workoutReminders}
              disabled={savingNotifications}
              onCheckedChange={(checked) => {
                setWorkoutReminders(checked);
                void updateNotifications({ workout: checked, meal: mealReminders });
              }}
            />
          </div>
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm font-medium">Recordatorios de comidas</p>
              <p className="text-xs text-muted-foreground">
                Avisos de las comidas de tu plan nutricional.
              </p>
            </div>
            <Switch
              checked={mealReminders}
              disabled={savingNotifications}
              onCheckedChange={(checked) => {
                setMealReminders(checked);
                void updateNotifications({ workout: workoutReminders, meal: checked });
              }}
            />
          </div>
        </CardContent>
      </Card>

      {trainer ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Plan de tu entrenador</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/12 text-primary">
                <Sparkles className="size-[18px]" />
              </div>
              <p className="text-sm font-semibold">
                Plan {subscriptionPlanLabels[trainer.subscription_plan]}
              </p>
            </div>
            <p className="text-sm text-muted-foreground">
              Tú no tienes un plan propio — las funciones disponibles dependen del plan que
              tenga contratado tu entrenador.
            </p>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Cuenta</CardTitle>
        </CardHeader>
        {/* Cerrar sesión ya no está aquí: vive en el menú del avatar,
            arriba, para no tener la misma acción en dos lugares. */}
        <CardContent className="flex flex-col gap-3">
          {profile.deletion_requested_at ? (
            <div className="flex flex-col gap-1 rounded-lg border border-destructive/30 bg-destructive/5 p-3">
              <p className="flex items-center gap-2 text-sm font-medium text-destructive">
                <AlertTriangle className="size-4" /> Eliminación solicitada
              </p>
              <p className="text-xs text-muted-foreground">
                Pediste eliminar tu cuenta el {formatDate(profile.deletion_requested_at.slice(0, 10))}.
                Tu entrenador se pondrá en contacto contigo para completar el proceso.
              </p>
            </div>
          ) : (
            <Button
              type="button"
              variant="ghost"
              className="w-full text-destructive hover:text-destructive"
              onClick={() => setDeleteOpen(true)}
            >
              <Trash2 /> Solicitar eliminación de cuenta
            </Button>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="¿Solicitar la eliminación de tu cuenta?"
        description="Se avisará a tu entrenador para que procese la baja de tu cuenta y de todos tus datos. Mientras tanto puedes seguir usando la app con normalidad, y puedes pedirle que cancele la solicitud."
        confirmLabel="Solicitar eliminación"
        loading={requestingDeletion}
        onConfirm={handleRequestDeletion}
      />
    </div>
  );
}
