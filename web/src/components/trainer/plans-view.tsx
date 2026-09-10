"use client";

import * as React from "react";
import { Check, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { subscriptionPlanLabels, type SubscriptionPlan } from "@/lib/types/settings";
import { Button } from "@/components/ui/button";

type Billing = "monthly" | "annual";

interface PlanRow {
  key: SubscriptionPlan;
  name: string;
  price_cents: number;
  included_clients: number | null;
  included_seats: number;
  ai_generations_included: number;
  features: string[];
  sort_order: number;
}

function pesos(cents: number) {
  return "$" + Math.round(cents / 100).toLocaleString("es-MX");
}

/**
 * Comparativa de planes — se muestra cuando el entrenador topa un límite o
 * intenta usar algo que su plan no incluye, en vez de un toast.
 *
 * El cobro anual da 2 meses gratis (12 → 10 meses de precio), y se muestra
 * dividido entre 12 para que el número que se lee sea el "equivalente
 * mensual" chico — aunque el cargo real es una vez al año.
 */
export function PlansView({
  currentPlan,
  reason,
}: {
  currentPlan: SubscriptionPlan;
  reason?: string;
}) {
  const [plans, setPlans] = React.useState<PlanRow[] | null>(null);
  const [billing, setBilling] = React.useState<Billing>("monthly");

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("plans")
        .select(
          "key, name, price_cents, included_clients, included_seats, ai_generations_included, features, sort_order",
        )
        .eq("is_active", true)
        .order("sort_order");
      if (!cancelled) setPlans((data ?? []) as PlanRow[]);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function choose(plan: PlanRow) {
    toast.info(
      `Escríbenos para activar el plan ${plan.name}${
        billing === "annual" ? " (anual)" : ""
      } — el pago con tarjeta llega muy pronto.`,
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {reason && (
        <p className="rounded-lg border border-border/80 bg-muted/40 px-4 py-3 text-sm">
          {reason}
        </p>
      )}

      <div className="flex items-center gap-3 text-sm">
        <span className="text-muted-foreground">Cobro</span>
        <div className="inline-flex overflow-hidden rounded-full border">
          <button
            type="button"
            onClick={() => setBilling("monthly")}
            className={cn(
              "px-3.5 py-1 text-xs font-semibold transition-colors",
              billing === "monthly" ? "bg-primary text-primary-foreground" : "text-muted-foreground",
            )}
          >
            Mensual
          </button>
          <button
            type="button"
            onClick={() => setBilling("annual")}
            className={cn(
              "px-3.5 py-1 text-xs font-semibold transition-colors",
              billing === "annual" ? "bg-primary text-primary-foreground" : "text-muted-foreground",
            )}
          >
            Anual · 2 meses gratis
          </button>
        </div>
      </div>

      {plans === null ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {plans.map((plan) => {
            const isCurrent = plan.key === currentPlan;
            const free = plan.price_cents === 0;
            // Anual = 10 meses de precio (2 gratis); se muestra ÷12.
            const annualTotalCents = plan.price_cents * 10;
            const shownPerMonthCents =
              billing === "annual" ? Math.round(annualTotalCents / 12) : plan.price_cents;
            return (
              <div
                key={plan.key}
                className={cn(
                  "flex flex-col gap-3 rounded-xl border p-4",
                  isCurrent ? "border-primary/60 bg-primary/[0.04]" : "border-border/80",
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-bold">{plan.name}</p>
                  {isCurrent && (
                    <span className="rounded-full bg-primary/12 px-2 py-0.5 text-[10px] font-semibold text-primary">
                      Tu plan
                    </span>
                  )}
                </div>

                <div className="flex flex-col gap-0.5">
                  <p className="text-2xl font-bold tracking-tight tabular-nums">
                    {free ? "Gratis" : `${pesos(shownPerMonthCents)}`}
                    {!free && <span className="text-xs font-medium text-muted-foreground"> / mes</span>}
                  </p>
                  {!free && billing === "annual" && (
                    <p className="text-[11px] text-muted-foreground">
                      Se cobra {pesos(annualTotalCents)} una vez al año
                    </p>
                  )}
                </div>

                <ul className="flex flex-1 flex-col gap-1.5 text-xs text-muted-foreground">
                  {plan.features.slice(0, 5).map((f) => (
                    <li key={f} className="flex gap-1.5">
                      {plan.ai_generations_included > 0 && /IA/i.test(f) ? (
                        <Sparkles className="mt-0.5 size-3 shrink-0 text-primary" />
                      ) : (
                        <Check className="mt-0.5 size-3 shrink-0 text-success" />
                      )}
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  type="button"
                  size="sm"
                  variant={isCurrent ? "outline" : "default"}
                  className="w-full"
                  disabled={isCurrent}
                  onClick={() => choose(plan)}
                >
                  {isCurrent ? "Plan actual" : `Cambiar a ${subscriptionPlanLabels[plan.key]}`}
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
