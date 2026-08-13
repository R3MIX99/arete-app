"use client";

import * as React from "react";
import { CheckCircle2, Plus, Users } from "lucide-react";

import { formatDate } from "@/lib/format";
import {
  addDays,
  sessionsInRange,
  todayKey,
  type CalendarAssignment,
} from "@/lib/calendar-logic";
import { MEASUREMENT_FIELDS, type MeasurementKey, type ProgressEntry } from "@/lib/types/progress";
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
import { AddMeasurementDialog } from "@/components/trainer/add-measurement-dialog";
import { ProgressPhotoThumbnail } from "@/components/trainer/progress-photo-thumbnail";

interface ClientRow {
  id: string;
  full_name: string;
  status: string;
}

export function ProgressTrackingView({
  trainerId,
  clients,
  assignments,
  entries,
  loggedDatesByClient,
}: {
  trainerId: string;
  clients: ClientRow[];
  assignments: CalendarAssignment[];
  entries: (ProgressEntry & { client_id: string })[];
  loggedDatesByClient: Record<string, string[]>;
}) {
  const [selectedClientId, setSelectedClientId] = React.useState(clients[0]?.id ?? "");
  const [metric, setMetric] = React.useState<MeasurementKey>("weight_kg");
  const [addOpen, setAddOpen] = React.useState(false);

  const selectedClient = clients.find((c) => c.id === selectedClientId);

  const clientEntries = React.useMemo(
    () => entries.filter((e) => e.client_id === selectedClientId),
    [entries, selectedClientId],
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
      clientEntries
        .filter((e) => e[metric] !== null)
        .map((e) => ({ label: formatDate(e.entry_date), value: e[metric] as number })),
    [clientEntries, metric],
  );

  const photos = React.useMemo(
    () =>
      clientEntries
        .filter((e) => e.photo_path)
        .slice()
        .reverse(),
    [clientEntries],
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
      <div className="flex flex-wrap gap-2 overflow-x-auto">
        {clients.map((client) => (
          <Badge
            key={client.id}
            variant={client.id === selectedClientId ? "default" : "outline"}
            className="h-8 shrink-0 cursor-pointer px-3"
            onClick={() => setSelectedClientId(client.id)}
          >
            {client.full_name}
          </Badge>
        ))}
      </div>

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
                <ProgressLineChart
                  unit="kg"
                  points={clientEntries
                    .filter((e) => e.weight_kg !== null)
                    .map((e) => ({ label: formatDate(e.entry_date), value: e.weight_kg as number }))}
                />
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
              <CardContent>
                <ProgressLineChart points={chartPoints} unit={activeField.unit} />
              </CardContent>
            </Card>
          </div>

          {photos.length > 0 && (
            <div>
              <h2 className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                Fotos de progreso
              </h2>
              <div className="flex gap-2 overflow-x-auto pb-2">
                {photos.map((entry) => (
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
        </>
      )}
    </div>
  );
}
