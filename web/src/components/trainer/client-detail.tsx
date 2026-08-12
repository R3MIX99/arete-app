"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, UserCheck, UserX } from "lucide-react";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import { initialsOf } from "@/lib/format";
import type { ClientProfile } from "@/lib/types/client";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const GOAL_OPTIONS = [
  { value: "lose_weight", label: "Perder peso" },
  { value: "gain_muscle", label: "Ganar músculo" },
  { value: "maintenance", label: "Mantenimiento" },
  { value: "performance", label: "Rendimiento" },
];

export function ClientDetail({ client }: { client: ClientProfile }) {
  const router = useRouter();
  const [fullName, setFullName] = React.useState(client.full_name);
  const [phone, setPhone] = React.useState(client.phone ?? "");
  const [goal, setGoal] = React.useState(client.goal ?? "");
  const [healthNotes, setHealthNotes] = React.useState(client.health_notes ?? "");
  const [status, setStatus] = React.useState(client.status);
  const [saving, setSaving] = React.useState(false);
  const [savedAt, setSavedAt] = React.useState<number | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        full_name: fullName,
        phone: phone || null,
        goal: goal || null,
        health_notes: healthNotes || null,
      })
      .eq("id", client.id);

    if (updateError) {
      setError("No se pudieron guardar los cambios. Intenta de nuevo.");
      toast.error("No se pudieron guardar los cambios");
    } else {
      setSavedAt(Date.now());
      toast.success("Cambios guardados");
      router.refresh();
    }
    setSaving(false);
  }

  async function toggleStatus() {
    const next = status === "active" ? "inactive" : "active";
    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ status: next })
      .eq("id", client.id);
    if (!updateError) {
      setStatus(next);
      toast.success(next === "active" ? "Cliente reactivado" : "Cliente desactivado");
      router.refresh();
    } else {
      toast.error("No se pudo actualizar el estado");
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 p-4 md:p-8">
      <Button variant="ghost" size="sm" className="w-fit" asChild>
        <Link href="/entrenador/clientes">
          <ArrowLeft /> Volver a clientes
        </Link>
      </Button>

      <div className="flex items-center gap-4">
        <Avatar className="size-14">
          <AvatarFallback
            className={status === "inactive" ? "opacity-50 text-base" : "text-base"}
          >
            {initialsOf(fullName) || "?"}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h1 className="truncate text-lg font-semibold">{fullName}</h1>
            {status === "inactive" && <Badge variant="warning">Inactivo</Badge>}
          </div>
          <p className="truncate text-sm text-muted-foreground">{client.email}</p>
        </div>
        <Button
          variant="outline"
          onClick={toggleStatus}
          className={
            status === "active"
              ? "text-destructive hover:text-destructive"
              : "text-success hover:text-success"
          }
        >
          {status === "active" ? <UserX /> : <UserCheck />}
          {status === "active" ? "Desactivar" : "Reactivar"}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Datos del cliente</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="full_name">Nombre</Label>
              <Input
                id="full_name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="phone">Teléfono</Label>
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Opcional"
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
              <Label htmlFor="health_notes">Notas de salud</Label>
              <Textarea
                id="health_notes"
                value={healthNotes}
                onChange={(e) => setHealthNotes(e.target.value)}
                rows={3}
                placeholder="Lesiones, condiciones médicas, restricciones..."
              />
            </div>

            {error ? (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            ) : null}

            <div className="flex items-center gap-3">
              <Button type="submit" disabled={saving}>
                {saving ? <Loader2 className="animate-spin" /> : null}
                Guardar cambios
              </Button>
              {savedAt && !saving && (
                <span className="text-xs text-success">Guardado.</span>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
