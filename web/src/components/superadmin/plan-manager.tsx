"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Gift, Loader2, Pencil } from "lucide-react";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import { formatDateTime, formatMoney } from "@/lib/format";
import {
  subscriptionPlanLabels,
  subscriptionStatusLabels,
  type SubscriptionPlan,
  type SubscriptionStatus,
} from "@/lib/types/settings";
import { planSourceLabels, type PlanCatalogEntry, type PlanChangeLogEntry } from "@/lib/types/plans";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const STATUS_OPTIONS: SubscriptionStatus[] = ["active", "trialing", "past_due", "canceled"];

/**
 * Tarjeta de "gestión de plan" para el detalle de un entrenador o
 * cliente en el panel de superadmin: muestra el plan actual (y si vino
 * de un cambio manual o del default del sistema) y abre un diálogo
 * para cambiarlo a mano, incluyendo otorgarlo gratis con fecha de
 * expiración opcional. Todo pasa por la función `superadmin_set_plan`,
 * que deja bitácora — este componente solo dispara la llamada y
 * refresca la página para traer el historial actualizado.
 */
export function PlanManager({
  profileId,
  currentPlan,
  currentStatus,
  planSource,
  planOverrideExpiresAt,
  plans,
  changeLog,
}: {
  profileId: string;
  currentPlan: SubscriptionPlan;
  currentStatus: SubscriptionStatus;
  planSource: "default" | "manual" | "stripe";
  planOverrideExpiresAt: string | null;
  plans: PlanCatalogEntry[];
  changeLog: PlanChangeLogEntry[];
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [planKey, setPlanKey] = React.useState<SubscriptionPlan>(currentPlan);
  const [status, setStatus] = React.useState<SubscriptionStatus>(currentStatus);
  const [isFreeGrant, setIsFreeGrant] = React.useState(false);
  const [expiresAt, setExpiresAt] = React.useState("");
  const [note, setNote] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  function openDialog() {
    setPlanKey(currentPlan);
    setStatus(currentStatus);
    setIsFreeGrant(false);
    setExpiresAt(planOverrideExpiresAt ? planOverrideExpiresAt.slice(0, 10) : "");
    setNote("");
    setOpen(true);
  }

  async function handleSave() {
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase.rpc("superadmin_set_plan", {
      p_profile_id: profileId,
      p_plan_key: planKey,
      p_status: status,
      p_is_free_grant: isFreeGrant,
      p_expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
      p_note: note.trim() || null,
    });
    setSaving(false);

    if (error) {
      toast.error(error.message || "No se pudo cambiar el plan.");
      return;
    }

    toast.success("Plan actualizado.");
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle className="text-sm">Plan y suscripción</CardTitle>
          <Button size="sm" variant="outline" onClick={openDialog}>
            <Pencil className="size-3.5" /> Cambiar plan
          </Button>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant="secondary">{subscriptionPlanLabels[currentPlan]}</Badge>
            <Badge variant="outline">{subscriptionStatusLabels[currentStatus]}</Badge>
            {planSource === "manual" ? (
              <Badge variant="warning">
                <Gift className="size-3" /> Cortesía / cambio manual
              </Badge>
            ) : null}
          </div>
          {planSource === "manual" && planOverrideExpiresAt ? (
            <p className="text-xs text-muted-foreground">
              Este cambio manual vence el {formatDateTime(planOverrideExpiresAt)}.
            </p>
          ) : null}
          <p className="text-xs text-muted-foreground">{planSourceLabels[planSource]}</p>

          {changeLog.length > 0 ? (
            <div className="mt-1 flex flex-col gap-2 border-t pt-3">
              <p className="text-xs font-medium text-muted-foreground">Historial de cambios</p>
              {changeLog.map((entry) => (
                <div key={entry.id} className="rounded-lg border px-3 py-2 text-xs">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium">
                      {entry.previous_plan
                        ? `${subscriptionPlanLabels[entry.previous_plan as SubscriptionPlan] ?? entry.previous_plan} → `
                        : ""}
                      {subscriptionPlanLabels[entry.new_plan as SubscriptionPlan] ?? entry.new_plan}
                      {entry.is_free_grant ? " (cortesía)" : ""}
                    </span>
                    <span className="text-muted-foreground">{formatDateTime(entry.changed_at)}</span>
                  </div>
                  {entry.changed_by_name ? (
                    <p className="mt-0.5 text-muted-foreground">Por {entry.changed_by_name}</p>
                  ) : null}
                  {entry.expires_at ? (
                    <p className="mt-0.5 text-muted-foreground">
                      Vence {formatDateTime(entry.expires_at)}
                    </p>
                  ) : null}
                  {entry.note ? <p className="mt-0.5">{entry.note}</p> : null}
                </div>
              ))}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <ResponsiveDialog open={open} onOpenChange={setOpen} title="Cambiar plan">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>Plan</Label>
            <Select value={planKey} onValueChange={(v) => setPlanKey(v as SubscriptionPlan)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {plans.map((plan) => (
                  <SelectItem key={plan.key} value={plan.key}>
                    {plan.name} — {plan.price_cents === 0 ? "Gratis" : formatMoney(plan.price_cents, plan.currency)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Estado</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as SubscriptionStatus)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s} value={s}>
                    {subscriptionStatusLabels[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5">
            <div>
              <p className="text-sm font-medium">Otorgar como cortesía gratuita</p>
              <p className="text-xs text-muted-foreground">
                Queda marcado en el historial como regalo, no como pago.
              </p>
            </div>
            <Switch checked={isFreeGrant} onCheckedChange={setIsFreeGrant} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="plan_expires_at">Vence el (opcional)</Label>
            <Input
              id="plan_expires_at"
              type="date"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="plan_note">Nota (opcional)</Label>
            <Textarea
              id="plan_note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Por qué se hizo este cambio…"
              rows={2}
            />
          </div>

          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="animate-spin" /> : null}
            Guardar
          </Button>
        </div>
      </ResponsiveDialog>
    </>
  );
}
