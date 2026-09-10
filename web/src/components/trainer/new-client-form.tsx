"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Copy, Loader2, Lock, PartyPopper } from "lucide-react";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import { subscriptionPlanLabels, type SubscriptionPlan } from "@/lib/types/settings";
import type { ClientUsage } from "@/lib/types/plans";
import { PlansView } from "@/components/trainer/plans-view";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

const GOAL_OPTIONS = [
  { value: "lose_weight", label: "Perder peso" },
  { value: "gain_muscle", label: "Ganar músculo" },
  { value: "maintenance", label: "Mantenimiento" },
  { value: "performance", label: "Rendimiento" },
];

export function NewClientForm({
  trainerId,
  usage,
  planKey,
}: {
  trainerId: string;
  usage: ClientUsage;
  planKey: SubscriptionPlan;
}) {
  const router = useRouter();
  const atLimit = usage.limit !== null && usage.activeClients >= usage.limit;
  const [fullName, setFullName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [goal, setGoal] = React.useState<string>("");
  const [healthNotes, setHealthNotes] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [inviteLink, setInviteLink] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { data, error: insertError } = await supabase
      .from("client_invitations")
      .insert({
        trainer_id: trainerId,
        email,
        full_name: fullName || null,
        goal: goal || null,
        health_notes: healthNotes || null,
      })
      .select("token")
      .single();

    if (insertError || !data) {
      const raw = insertError?.message ?? "";
      // La policy de INSERT exige cupo en el plan: si no hay, PostgREST
      // devuelve un error de RLS ("row-level security" / código 42501).
      const isLimit =
        insertError?.code === "42501" ||
        /row-level security|violates row-level/i.test(raw);
      const message = raw.includes("duplicate")
        ? "Ya existe una invitación pendiente para ese correo."
        : isLimit
          ? `Llegaste al límite de clientes de tu plan ${subscriptionPlanLabels[planKey]} (${usage.limit}). Sube de plan o contrata un bloque de 5 clientes más.`
          : "No se pudo crear la invitación. Intenta de nuevo.";
      setError(message);
      toast.error(message);
      setLoading(false);
      return;
    }

    toast.success("Invitación creada");
    setInviteLink(`${window.location.origin}/registro/invitacion/${data.token}`);
    setLoading(false);
  }

  function copyLink() {
    if (!inviteLink) return;
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    toast.success("Enlace copiado");
    setTimeout(() => setCopied(false), 2000);
  }

  if (inviteLink) {
    return (
      <div className="mx-auto flex w-full max-w-md flex-col items-center gap-6 p-4 py-16 text-center md:p-8">
        <div className="flex size-12 items-center justify-center rounded-full bg-success/12 text-success">
          <PartyPopper className="size-6" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">Invitación creada</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Comparte este enlace con {fullName || "tu cliente"} para que se una a tu
            programa. Queda pendiente hasta que lo abra y complete su registro.
          </p>
        </div>
        <div className="flex w-full items-center gap-2">
          <Input readOnly value={inviteLink} className="text-xs" />
          <Button type="button" variant="outline" size="icon" onClick={copyLink}>
            <Copy />
          </Button>
        </div>
        {copied && <p className="text-xs text-success">Enlace copiado.</p>}
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.push("/entrenador/clientes")}>
            Ir a Clientes
          </Button>
          <Button
            onClick={() => {
              setInviteLink(null);
              setFullName("");
              setEmail("");
              setGoal("");
              setHealthNotes("");
            }}
          >
            Agregar otro cliente
          </Button>
        </div>
      </div>
    );
  }

  if (atLimit) {
    return (
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-5 p-4 md:p-8">
        <Button variant="ghost" size="sm" className="w-fit" asChild>
          <Link href="/entrenador/clientes">
            <ArrowLeft /> Volver a clientes
          </Link>
        </Button>
        <div className="flex items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-warning/12 text-warning">
            <Lock className="size-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Llegaste al límite de tu plan</h2>
            <p className="text-sm text-muted-foreground">
              Tu plan {subscriptionPlanLabels[planKey]} incluye {usage.limit} clientes activos y
              ya los tienes ocupados.
            </p>
          </div>
        </div>
        <PlansView
          currentPlan={planKey}
          reason="Para agregar a más clientes, sube de plan o contrata un bloque de 5 clientes más. También puedes desactivar a alguien que ya no atiendas."
        />
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-4 p-4 md:p-8">
      <Button variant="ghost" size="sm" className="w-fit" asChild>
        <Link href="/entrenador/clientes">
          <ArrowLeft /> Volver a clientes
        </Link>
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>Agregar cliente</CardTitle>
          <CardDescription>
            Se genera un enlace de invitación — tu cliente lo abre y completa su
            propio registro.
            {usage.limit !== null && (
              <>
                {" "}
                Vas <strong>{usage.activeClients} de {usage.limit}</strong> clientes de tu plan{" "}
                {subscriptionPlanLabels[planKey]}.
              </>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="full_name">Nombre</Label>
              <Input
                id="full_name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Nombre del cliente"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">Correo</Label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="cliente@correo.com"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="goal">Objetivo</Label>
              <Select value={goal} onValueChange={setGoal}>
                <SelectTrigger id="goal">
                  <SelectValue placeholder="Sin definir" />
                </SelectTrigger>
                <SelectContent>
                  {GOAL_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="health_notes">Notas de salud (opcional)</Label>
              <Textarea
                id="health_notes"
                value={healthNotes}
                onChange={(e) => setHealthNotes(e.target.value)}
                placeholder="Lesiones, condiciones médicas, restricciones..."
                rows={3}
              />
            </div>

            {error ? (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            ) : null}

            <Button type="submit" disabled={loading} className="mt-1">
              {loading ? <Loader2 className="animate-spin" /> : null}
              Generar enlace de invitación
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
