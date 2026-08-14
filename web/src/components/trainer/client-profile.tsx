"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Dumbbell, Eye, Pencil, Plus, UserCheck, UserX } from "lucide-react";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import { initialsOf, goalLabel, formatDate } from "@/lib/format";
import { MEASUREMENT_FIELDS, type MeasurementKey } from "@/lib/types/progress";
import type { ExerciseProgressSummary, ProgressMeasurement } from "@/lib/types/progress";
import type { ClientProfile as ClientProfileType } from "@/lib/types/client";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ProgressLineChart } from "@/components/trainer/progress-line-chart";
import { EditClientDialog } from "@/components/trainer/edit-client-dialog";
import { AddMeasurementDialog } from "@/components/trainer/add-measurement-dialog";
import { EditMeasurementDialog } from "@/components/trainer/edit-measurement-dialog";
import { ExerciseProgressDialog } from "@/components/trainer/exercise-progress-dialog";
import { MeasurementEntriesTable } from "@/components/trainer/measurement-entries-table";

export function ClientProfile({
  trainerId,
  client,
  measurements,
  exerciseSummaries,
}: {
  trainerId: string;
  client: ClientProfileType;
  measurements: ProgressMeasurement[];
  exerciseSummaries: ExerciseProgressSummary[];
}) {
  const router = useRouter();
  const [status, setStatus] = React.useState(client.status);
  const [togglingStatus, setTogglingStatus] = React.useState(false);
  const [editOpen, setEditOpen] = React.useState(false);
  const [addMeasurementOpen, setAddMeasurementOpen] = React.useState(false);
  const [editingMeasurement, setEditingMeasurement] =
    React.useState<ProgressMeasurement | null>(null);
  const [metric, setMetric] = React.useState<MeasurementKey>("weight_kg");
  const [selectedExercise, setSelectedExercise] =
    React.useState<ExerciseProgressSummary | null>(null);

  async function toggleStatus() {
    const next = status === "active" ? "inactive" : "active";
    setTogglingStatus(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("profiles")
      .update({ status: next })
      .eq("id", client.id);
    setTogglingStatus(false);
    if (error) {
      toast.error("No se pudo actualizar el estado");
      return;
    }
    setStatus(next);
    toast.success(next === "active" ? "Cliente reactivado" : "Cliente desactivado");
    router.refresh();
  }

  const activeField = MEASUREMENT_FIELDS.find((f) => f.key === metric)!;
  const chartPoints = React.useMemo(
    () =>
      measurements
        .filter((m) => m.metric_key === metric)
        .sort((a, b) => a.entry_date.localeCompare(b.entry_date))
        .map((m) => ({ label: formatDate(m.entry_date), value: m.value })),
    [measurements, metric],
  );

  return (
    <div className="flex w-full flex-col gap-5 p-4 pb-24 md:p-8">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" className="w-fit" asChild>
          <Link href="/entrenador/clientes">
            <ArrowLeft /> Volver a clientes
          </Link>
        </Button>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Editar información"
            onClick={() => setEditOpen(true)}
          >
            <Pencil />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label={status === "active" ? "Desactivar cliente" : "Reactivar cliente"}
            disabled={togglingStatus}
            onClick={toggleStatus}
            className={
              status === "active"
                ? "text-destructive hover:text-destructive"
                : "text-success hover:text-success"
            }
          >
            {status === "active" ? <UserX /> : <UserCheck />}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-[minmax(0,26rem)_1fr] md:items-start">
        {/* Columna izquierda: identidad, notas, progreso físico. */}
        <div className="flex flex-col gap-5">
          <div className="flex items-center gap-4">
            <Avatar className="size-16">
              <AvatarFallback
                className={status === "inactive" ? "text-lg opacity-50" : "text-lg"}
              >
                {initialsOf(client.full_name) || "?"}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h1 className="truncate text-2xl font-bold">{client.full_name}</h1>
                {status === "inactive" && <Badge variant="warning">Inactivo</Badge>}
              </div>
              <p className="truncate text-sm text-muted-foreground">{client.email}</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {client.goal && <Badge variant="secondary">{goalLabel(client.goal)}</Badge>}
                {client.phone && <Badge variant="secondary">{client.phone}</Badge>}
              </div>
            </div>
          </div>

          {client.health_notes && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Notas de salud</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{client.health_notes}</p>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle className="text-sm">Progreso físico</CardTitle>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setAddMeasurementOpen(true)}
              >
                <Plus /> Agregar medición
              </Button>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <Select value={metric} onValueChange={(v) => setMetric(v as MeasurementKey)}>
                <SelectTrigger className="w-[200px]">
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

              <ProgressLineChart points={chartPoints} unit={activeField.unit} />

              <MeasurementEntriesTable
                measurements={measurements}
                metric={metric}
                onEdit={(measurement) => setEditingMeasurement(measurement)}
                onChanged={() => router.refresh()}
              />
            </CardContent>
          </Card>
        </div>

        {/* Columna derecha: ejercicios. */}
        <div>
          <h2 className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            Ejercicios
          </h2>
          {exerciseSummaries.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center gap-2 py-10 text-center text-muted-foreground">
                <Dumbbell className="size-6" />
                <p className="text-sm">
                  Todavía no hay registros de peso en los ejercicios de este cliente.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-foreground/[0.02] text-left text-xs text-muted-foreground uppercase">
                    <th className="px-3 py-2 font-medium">Ejercicio</th>
                    <th className="px-3 py-2 font-medium">Peso inicial</th>
                    <th className="px-3 py-2 font-medium">Peso actual</th>
                    <th className="w-10 px-3 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {exerciseSummaries.map((summary) => (
                    <tr key={summary.exercise_id} className="border-b last:border-0">
                      <td className="px-3 py-2 font-medium">{summary.exercise_name}</td>
                      <td className="px-3 py-2 tabular-nums text-muted-foreground">
                        {summary.starting_weight} kg
                      </td>
                      <td className="px-3 py-2 tabular-nums font-medium">
                        {summary.current_weight} kg
                      </td>
                      <td className="px-3 py-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label={`Ver progreso de ${summary.exercise_name}`}
                          onClick={() => setSelectedExercise(summary)}
                        >
                          <Eye className="size-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <EditClientDialog open={editOpen} onOpenChange={setEditOpen} client={client} />

      <AddMeasurementDialog
        open={addMeasurementOpen}
        onOpenChange={setAddMeasurementOpen}
        clientId={client.id}
        trainerId={trainerId}
        onAdded={() => {}}
      />

      <EditMeasurementDialog
        open={editingMeasurement !== null}
        onOpenChange={(open) => !open && setEditingMeasurement(null)}
        measurement={editingMeasurement}
        onSaved={() => setEditingMeasurement(null)}
      />

      <ExerciseProgressDialog
        open={selectedExercise !== null}
        onOpenChange={(open) => !open && setSelectedExercise(null)}
        summary={selectedExercise}
      />
    </div>
  );
}
