"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, Pencil } from "lucide-react";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import { logActivity } from "@/lib/log-activity";
import { formatMoney } from "@/lib/format";
import type { PlanCatalogEntry, TrainerSubscription } from "@/lib/types/plans";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";

/**
 * Extras contratados por encima del mínimo del plan: bloques de clientes
 * (de 5 en 5), seats de equipo (solo tiene sentido en Gym) y paquetes
 * extra de generaciones de IA. Mientras no exista Stripe (Fase H del
 * roadmap), es el superadmin quien los otorga a mano desde aquí — el
 * entrenador de prueba, cortesías, o mientras se resuelve un cobro por
 * fuera. Todo queda en trainer_subscription, con RLS que solo deja
 * escribir a superadmin (trainer_subscription_write_superadmin).
 */
export function SubscriptionExtrasManager({
  trainerId,
  subscription,
  plan,
}: {
  trainerId: string;
  subscription: TrainerSubscription;
  /** El plan actual del entrenador — trae los tamaños/precios de bloque,
   *  seat y paquete de IA para mostrarlos junto al campo. */
  plan: PlanCatalogEntry | null;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [extraClientBlocks, setExtraClientBlocks] = React.useState(subscription.extra_client_blocks);
  const [extraSeats, setExtraSeats] = React.useState(subscription.extra_seats);
  const [aiExtraPacks, setAiExtraPacks] = React.useState(subscription.ai_extra_packs);
  const [saving, setSaving] = React.useState(false);

  function openDialog() {
    setExtraClientBlocks(subscription.extra_client_blocks);
    setExtraSeats(subscription.extra_seats);
    setAiExtraPacks(subscription.ai_extra_packs);
    setOpen(true);
  }

  async function handleSave() {
    setSaving(true);
    const supabase = createClient();

    const { error } = await supabase
      .from("trainer_subscription")
      .update({
        extra_client_blocks: extraClientBlocks,
        extra_seats: extraSeats,
        ai_extra_packs: aiExtraPacks,
        updated_at: new Date().toISOString(),
      })
      .eq("trainer_id", trainerId);

    if (error) {
      setSaving(false);
      toast.error(error.message || "No se pudieron guardar los extras.");
      return;
    }

    // Bloques de clientes cambiaron el límite efectivo — hay que
    // recalcular si sigue (o ya no) sobre el límite, igual que hace
    // superadmin_set_plan() al cambiar de plan.
    await supabase.rpc("refresh_over_limit_grace", { p_trainer_id: trainerId });

    logActivity({
      action: "superadmin.trainer_extras_updated",
      category: "superadmin",
      severity: "success",
      message: "Extras de suscripción actualizados a mano",
      targetType: "trainer",
      targetId: trainerId,
      context: {
        extra_client_blocks: extraClientBlocks,
        extra_seats: extraSeats,
        ai_extra_packs: aiExtraPacks,
        previous: {
          extra_client_blocks: subscription.extra_client_blocks,
          extra_seats: subscription.extra_seats,
          ai_extra_packs: subscription.ai_extra_packs,
        },
      },
    });

    setSaving(false);
    toast.success("Extras actualizados.");
    setOpen(false);
    router.refresh();
  }

  const extraClients = subscription.extra_client_blocks * (plan?.extra_block_size ?? 5);
  const extraAiGenerations = subscription.ai_extra_packs * (plan?.ai_extra_pack_size ?? 0);

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle className="text-sm">Extras contratados</CardTitle>
          <Button size="sm" variant="outline" onClick={openDialog}>
            <Pencil className="size-3.5" /> Editar extras
          </Button>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-lg border px-3 py-2.5">
            <p className="text-xs text-muted-foreground">Bloques de clientes</p>
            <p className="text-lg font-semibold tabular-nums">
              {subscription.extra_client_blocks}
              {extraClients > 0 ? (
                <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                  (+{extraClients} clientes)
                </span>
              ) : null}
            </p>
          </div>
          <div className="rounded-lg border px-3 py-2.5">
            <p className="text-xs text-muted-foreground">Seats extra</p>
            <p className="text-lg font-semibold tabular-nums">{subscription.extra_seats}</p>
          </div>
          <div className="rounded-lg border px-3 py-2.5">
            <p className="text-xs text-muted-foreground">Paquetes extra de IA</p>
            <p className="text-lg font-semibold tabular-nums">
              {subscription.ai_extra_packs}
              {extraAiGenerations > 0 ? (
                <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                  (+{extraAiGenerations} generaciones)
                </span>
              ) : null}
            </p>
          </div>
        </CardContent>
      </Card>

      <ResponsiveDialog open={open} onOpenChange={setOpen} title="Editar extras">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="extra_client_blocks">Bloques de clientes extra</Label>
            <Input
              id="extra_client_blocks"
              type="number"
              min={0}
              value={extraClientBlocks}
              onChange={(e) => setExtraClientBlocks(Math.max(0, Number(e.target.value) || 0))}
            />
            <p className="text-xs text-muted-foreground">
              Cada bloque son {plan?.extra_block_size ?? 5} clientes
              {plan?.extra_block_price_cents
                ? ` — ${formatMoney(plan.extra_block_price_cents, plan.currency)}/mes por bloque`
                : ""}
              . {plan?.extra_block_price_cents == null ? "Este plan no admite bloques extra." : ""}
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="extra_seats">Seats de equipo extra</Label>
            <Input
              id="extra_seats"
              type="number"
              min={0}
              value={extraSeats}
              onChange={(e) => setExtraSeats(Math.max(0, Number(e.target.value) || 0))}
            />
            <p className="text-xs text-muted-foreground">
              Solo aplica al plan Gym
              {plan?.extra_seat_price_cents
                ? ` — ${formatMoney(plan.extra_seat_price_cents, plan.currency)}/mes por seat`
                : ""}
              .
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ai_extra_packs">Paquetes extra de generaciones de IA</Label>
            <Input
              id="ai_extra_packs"
              type="number"
              min={0}
              value={aiExtraPacks}
              onChange={(e) => setAiExtraPacks(Math.max(0, Number(e.target.value) || 0))}
            />
            <p className="text-xs text-muted-foreground">
              Cada paquete son {plan?.ai_extra_pack_size ?? 0} generaciones
              {plan?.ai_extra_pack_price_cents
                ? ` — ${formatMoney(plan.ai_extra_pack_price_cents, plan.currency)}/mes por paquete`
                : ""}
              .
            </p>
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
