"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, ChevronsUpDown, Plus, Users } from "lucide-react";

import { formatDate, initialsOf } from "@/lib/format";
import {
  addDays,
  sessionsInRange,
  todayKey,
  type CalendarAssignment,
} from "@/lib/calendar-logic";
import {
  MEASUREMENT_FIELDS,
  type MeasurementKey,
  type ProgressMeasurement,
  type ProgressPhotoEntry,
} from "@/lib/types/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
import { AddMeasurementDialog } from "@/components/trainer/add-measurement-dialog";
import { EditMeasurementDialog } from "@/components/trainer/edit-measurement-dialog";
import { ProgressPhotoThumbnail } from "@/components/trainer/progress-photo-thumbnail";
import { ClientPickerDialog } from "@/components/trainer/client-picker-dialog";
import { MeasurementEntriesTable } from "@/components/trainer/measurement-entries-table";

interface ClientRow {
  id: string;
  full_name: string;
  status: string;
}

export function ProgressTrackingView({
  trainerId,
  clients,
  assignments,
  measurements,
  photos,
  loggedDatesByClient,
}: {
  trainerId: string;
  clients: ClientRow[];
  assignments: CalendarAssignment[];
  measurements: (ProgressMeasurement & { client_id: string })[];
  photos: (ProgressPhotoEntry & { client_id: string })[];
  loggedDatesByClient: Record<string, string[]>;
}) {
  const router = useRouter();
  const [selectedClientId, setSelectedClientId] = React.useState(clients[0]?.id ?? "");
  const [metric, setMetric] = React.useState<MeasurementKey>("weight_kg");
  const [addOpen, setAddOpen] = React.useState(false);
  const [pickerOpen, setPickerOpen] = React.useState(false);
  const [editingMeasurement, setEditingMeasurement] =
    React.useState<ProgressMeasurement | null>(null);

  const selectedClient = clients.find((c) => c.id === selectedClientId);

  const clientMeasurements = React.useMemo(
    () => measurements.filter((m) => m.client_id === selectedClientId),
    [measurements, selectedClientId],
  );

  const clientPhotos = React.useMemo(
    () => photos.filter((p) => p.client_id === selectedClientId).slice().reverse(),
    [photos, selectedClientId],
  );

  const compliance = React.useMemo(() => {
    if (!selectedClientId) return null;
    const clientAssignments = assignments.filter((a) => a.clientId === selectedClientId);
    const rangeEnd = todayKey();
    const rangeStart = addDays(rangeEnd, -28);
    const scheduled = sessionsInRange(clientAssignments, rangeStart, rangeEnd);
    if (scheduled.length === 0) return null;
    const scheduledDates = new Set(scheduled.map((s) => s.date));
    const loggedDates = new Set(loggedDatesByClient[selectedClientId] ?? []);
    const completed = Array.from(scheduledDates).filter((d) => loggedDates.has(d)).length;
    return completed / scheduledDates.size;
  }, [assignments, loggedDatesByClient, selectedClientId]);

  const activeField = MEASUREMENT_FIELDS.find((f) => f.key === metric)!;
  const chartPoints = React.useMemo(
    () =>
      clientMeasurements
        .filter((m) => m.metric_key === metric)
        .sort((a, b) => a.entry_date.localeCompare(b.entry_date))
        .map((m) => ({ label: formatDate(m.entry_date), value: m.value })),
    [clientMeasurements, metric],
  );

  const weightPoints = React.useMemo(
    () =>
      clientMeasurements
        .filter((m) => m.metric_key === "weight_kg")
        .sort((a, b) => a.entry_date.localeCompare(b.entry_date))
        .map((m) => ({ label: formatDate(m.entry_date), value: m.value })),
    [clientMeasurements],
  );

  if (clients.length === 0) {
    return (
      <div className="flex w-full flex-col items-center justify-center gap-2 p-16 text-center text-muted-foreground">
        <Users className="size-8" />
        <p className="text-sm">Todavía no tienes clientes activos.</p>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-5 p-4 pb-24 md:p-8">
      <button
        type="button"
        onClick={() => setPickerOpen(true)}
        className="flex w-fit items-center gap-2.5 rounded-lg border px-3 py-2 text-left transition-colors hover:bg-accent"
      >
        <Avatar className="size-8">
          <AvatarFallback className="text-xs">
            {initialsOf(selectedClient?.full_name ?? "") || "?"}
          </AvatarFallback>
        </Avatar>
        <span className="text-sm font-medium">
          {selectedClient?.full_name ?? "Elegir cliente"}
        </span>
        <ChevronsUpDown className="size-3.5 text-muted-foreground" />
      </button>

      <ClientPickerDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        clients={clients}
        onPick={(client) => setSelectedClientId(client.id)}
      />

      {selectedClient && (
        <>
          <Card>
            <CardContent className="flex items-center gap-3">
              <CheckCircle2 className="size-7 shrink-0 text-primary" />
              <div className="min-w-0">
                <p className="text-sm text-muted-foreground">
                  Cumplimiento de rutinas (últimas 4 semanas)
                </p>
                <p className="text-lg font-semibold">
                  {compliance === null
                    ? "Sin sesiones programadas en este período."
                    : `${Math.round(compliance * 100)}% de las sesiones programadas`}
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 md:items-start">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Peso corporal</CardTitle>
              </CardHeader>
              <CardContent>
                <ProgressLineChart unit="kg" points={weightPoints} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex-row items-center justify-between">
                <CardTitle className="text-sm">Medidas</CardTitle>
                <Select value={metric} onValueChange={(v) => setMetric(v as MeasurementKey)}>
                  <SelectTrigger className="w-[160px]">
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
              <CardContent className="flex flex-col gap-4">
                <ProgressLineChart points={chartPoints} unit={activeField.unit} />
              </CardContent>
            </Card>
          </div>

          <div>
            <h2 className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              Registros
            </h2>
            <MeasurementEntriesTable
              measurements={clientMeasurements}
              metric={metric}
              onEdit={(measurement) => setEditingMeasurement(measurement)}
              onChanged={() => router.refresh()}
            />
          </div>

          {clientPhotos.length > 0 && (
            <div>
              <h2 className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                Fotos de progreso
              </h2>
              <div className="flex gap-2 overflow-x-auto pb-2">
                {clientPhotos.map((entry) => (
                  <ProgressPhotoThumbnail
                    key={entry.id}
                    photoPath={entry.photo_path!}
                    date={entry.entry_date}
                  />
                ))}
              </div>
            </div>
          )}

          <Button type="button" className="w-fit" onClick={() => setAddOpen(true)}>
            <Plus /> Agregar registro
          </Button>

          <AddMeasurementDialog
            open={addOpen}
            onOpenChange={setAddOpen}
            clientId={selectedClient.id}
            trainerId={trainerId}
            onAdded={() => {}}
          />

          <EditMeasurementDialog
            open={editingMeasurement !== null}
            onOpenChange={(open) => !open && setEditingMeasurement(null)}
            measurement={editingMeasurement}
            onSaved={() => setEditingMeasurement(null)}
          />
        </>
      )}
    </div>
  );
}
