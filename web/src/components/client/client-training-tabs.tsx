"use client";

import { useMemo, useState } from "react";
import { CalendarClock, Dumbbell } from "lucide-react";

import { formatDate } from "@/lib/format";
import {
  MEASUREMENT_FIELDS,
  type MeasurementKey,
  type ProgressMeasurement,
  type ProgressPhotoEntry,
} from "@/lib/types/progress";
import type { ClientExerciseProgress, CompletedSessionRow } from "@/lib/types/client-panel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ProgressLineChart } from "@/components/trainer/progress-line-chart";
import { ProgressPhotoThumbnail } from "@/components/trainer/progress-photo-thumbnail";

function formatDuration(seconds: number | null): string {
  if (!seconds) return "";
  const m = Math.round(seconds / 60);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem > 0 ? `${h} h ${rem} min` : `${h} h`;
}

export function ClientTrainingTabs({
  completedSessions,
  measurements,
  photos,
  exerciseProgress,
}: {
  completedSessions: CompletedSessionRow[];
  measurements: ProgressMeasurement[];
  photos: ProgressPhotoEntry[];
  exerciseProgress: ClientExerciseProgress[];
}) {
  const [metric, setMetric] = useState<MeasurementKey>("weight_kg");
  const [selectedExerciseId, setSelectedExerciseId] = useState(exerciseProgress[0]?.exerciseId ?? "");

  const activeField = MEASUREMENT_FIELDS.find((f) => f.key === metric)!;
  const measurementPoints = useMemo(
    () =>
      measurements
        .filter((m) => m.metric_key === metric)
        .sort((a, b) => a.entry_date.localeCompare(b.entry_date))
        .map((m) => ({ label: formatDate(m.entry_date), value: m.value })),
    [measurements, metric],
  );

  const weightPoints = useMemo(
    () =>
      measurements
        .filter((m) => m.metric_key === "weight_kg")
        .sort((a, b) => a.entry_date.localeCompare(b.entry_date))
        .map((m) => ({ label: formatDate(m.entry_date), value: m.value })),
    [measurements],
  );

  const selectedExercise = exerciseProgress.find((e) => e.exerciseId === selectedExerciseId);
  const exercisePoints = useMemo(
    () => (selectedExercise?.logs ?? []).map((l) => ({ label: formatDate(l.date), value: l.weight })),
    [selectedExercise],
  );

  const orderedPhotos = useMemo(() => photos.slice().reverse(), [photos]);

  return (
    <div className="mx-auto flex max-w-md flex-col gap-4 p-4 pb-24">
      <h1 className="text-xl font-semibold">Entrenamiento</h1>

      <Tabs defaultValue="historial">
        <TabsList className="w-full">
          <TabsTrigger value="historial">Historial</TabsTrigger>
          <TabsTrigger value="progreso">Progreso</TabsTrigger>
        </TabsList>

        <TabsContent value="historial" className="mt-4">
          {completedSessions.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
                <CalendarClock className="size-8 text-muted-foreground" />
                <p className="font-medium">Todavía no tienes sesiones completadas</p>
                <p className="text-sm text-muted-foreground">
                  Cuando termines un entrenamiento, aparecerá aquí.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="flex flex-col gap-2.5">
              {completedSessions.map((session) => (
                <Card key={session.id}>
                  <CardContent className="flex items-center gap-3 p-4">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Dumbbell className="size-4.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{session.routineName}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(session.sessionDate)}
                        {session.durationSeconds ? ` · ${formatDuration(session.durationSeconds)}` : ""}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="progreso" className="mt-4 flex flex-col gap-4">
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
              <ProgressLineChart points={measurementPoints} unit={activeField.unit} />
            </CardContent>
          </Card>

          {exerciseProgress.length > 0 ? (
            <Card>
              <CardHeader className="flex-row items-center justify-between">
                <CardTitle className="text-sm">Progreso por ejercicio</CardTitle>
                <Select value={selectedExerciseId} onValueChange={setSelectedExerciseId}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {exerciseProgress.map((e) => (
                      <SelectItem key={e.exerciseId} value={e.exerciseId}>
                        {e.exerciseName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardHeader>
              <CardContent>
                <ProgressLineChart
                  unit="kg"
                  points={exercisePoints}
                  emptyMessage="Todavía no hay registros de peso para este ejercicio."
                />
              </CardContent>
            </Card>
          ) : null}

          {orderedPhotos.length > 0 ? (
            <div>
              <h2 className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                Fotos de progreso
              </h2>
              <div className="flex gap-2 overflow-x-auto pb-2">
                {orderedPhotos.map((entry) => (
                  <ProgressPhotoThumbnail
                    key={entry.id}
                    photoPath={entry.photo_path!}
                    date={entry.entry_date}
                  />
                ))}
              </div>
            </div>
          ) : null}
        </TabsContent>
      </Tabs>
    </div>
  );
}
