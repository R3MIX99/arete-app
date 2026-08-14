"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
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

export function NewProgramForm({ trainerId }: { trainerId: string }) {
  const router = useRouter();
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [goal, setGoal] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    // El programa arranca con 1 semana — las siguientes se agregan
    // desde el constructor con "Agregar semana" o clonando una semana
    // existente, ya no se define una duración fija de antemano.
    const supabase = createClient();
    const { data, error: insertError } = await supabase
      .from("programs")
      .insert({
        trainer_id: trainerId,
        name,
        duration_weeks: 1,
        description: description || null,
        goal: goal || null,
      })
      .select("id")
      .single();

    if (insertError || !data) {
      setError("No se pudo crear el programa. Intenta de nuevo.");
      toast.error("No se pudo crear el programa");
      setLoading(false);
      return;
    }

    toast.success("Programa creado");
    router.push(`/entrenador/programas/${data.id}`);
    router.refresh();
  }

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-4 p-4 md:p-8">
      <Button variant="ghost" size="sm" className="w-fit" asChild>
        <Link href="/entrenador/programas">
          <ArrowLeft /> Volver a programas
        </Link>
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>Nuevo programa</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="name">Nombre</Label>
              <Input
                id="name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej. Hipertrofia 8 semanas"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="goal">Objetivo (opcional)</Label>
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
              <Label htmlFor="description">Descripción (opcional)</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>

            {error ? (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            ) : null}

            <Button type="submit" disabled={loading} className="mt-1 w-fit">
              {loading ? <Loader2 className="animate-spin" /> : null}
              Crear programa
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
