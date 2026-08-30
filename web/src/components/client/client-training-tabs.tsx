"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CalendarClock, ChevronRight, Dumbbell, Search } from "lucide-react";

import { formatDate } from "@/lib/format";
import {
  MEASUREMENT_FIELDS,
  type MeasurementKey,
  type ProgressMeasurement,
  type ProgressPhotoEntry,
} from "@/lib/types/progress";
import type { ClientExerciseProgress, CompletedSessionRow } from "@/lib/types/client-panel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
import { ClientExerciseEvolution } from "@/components/client/client-exercise-evolution";
import { DateRangeFilter, type SessionDateRange } from "@/components/client/date-range-filter";

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
  const [historySearch, setHistorySearch] = useState("");
  const [historyDateRange, setHistoryDateRange] = useState<SessionDateRange | null>(null);

  const filteredSessions = useMemo(() => {
    const query = historySearch.trim().toLowerCase();
    return completedSessions.filter((session) => {
      if (query && !session.routineName.toLowerCase().includes(query)) return false;
      if (historyDateRange) {
        // session_date es 'YYYY-MM-DD' — se compara como fecha local a
        // medianoche, para que el día del filtro incluya toda la fecha
        // sin importar la hora exacta de la sesión.
        const sessionDate = new Date(`${session.sessionDate}T00:00:00`);
        if (sessionDate < historyDateRange.from || sessionDate > historyDateRange.to) return false;
      }
      return true;
    });
  }, [completedSessions, historySearch, historyDateRange]);

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

  const orderedPhotos = useMemo(() => photos.slice().reverse(), [photos]);

  return (
    <div className="mx-auto flex max-w-md flex-col gap-4 p-4 pb-24">
      <h1 className="text-xl font-semibold">Historial</h1>

      <Tabs defaultValue="historial">
        <TabsList className="w-full">
          <TabsTrigger value="historial">Historial</TabsTrigger>
          <TabsTrigger value="progreso">Progreso</TabsTrigger>
          <TabsTrigger value="evolucion">Evolución</TabsTrigger>
        </TabsList>

        <TabsContent value="historial" className="mt-4 flex flex-col gap-3">
          {completedSessions.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center">
              <CalendarClock className="size-8 text-muted-foreground" />
              <p className="font-medium">Todavía no tienes sesiones completadas</p>
              <p className="text-sm text-muted-foreground">
                Cuando termines un entrenamiento, aparecerá aquí.
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <div className="relative min-w-0 flex-1">
                  <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={historySearch}
                    onChange={(e) => setHistorySearch(e.target.value)}
                    placeholder="Buscar rutina"
                    className="pl-9"
                  />
                </div>
                <DateRangeFilter value={historyDateRange} onChange={setHistoryDateRange} />
              </div>

              {filteredSessions.length === 0 ? (
                <p className="py-10 text-center text-sm text-muted-foreground">Sin resultados.</p>
              ) : (
                // Sin tarjetas: lista plana, una fila compacta por sesión
                // — el chip de series completadas es el insight rápido,
                // sin tener que abrir el detalle.
                <div className="flex flex-col">
                  {filteredSessions.map((session) => (
                    <Link
                      key={session.id}
                      href={`/cliente/entrenamiento/sesion/${session.id}`}
                      className="flex items-center gap-3 py-3.5 transition-colors hover:bg-accent/40"
                    >
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <Dumbbell className="size-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{session.routineName}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(session.sessionDate)}
                          {session.durationSeconds ? ` · ${formatDuration(session.durationSeconds)}` : ""}
                        </p>
                      </div>
                      {session.completedSets > 0 && (
                        <span className="shrink-0 rounded-full bg-primary/12 px-2.5 py-1 text-xs tabular-nums text-primary">
                          {session.completedSets} series
                        </span>
                      )}
                      <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                    </Link>
                  ))}
                </div>
              )}
            </>
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
                <SelectTrigger className="w-auto min-w-0 whitespace-nowrap">
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

        <TabsContent value="evolucion" className="mt-4">
          <ClientExerciseEvolution exerciseProgress={exerciseProgress} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
