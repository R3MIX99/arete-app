"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Apple,
  ArrowLeft,
  CalendarClock,
  CalendarRange,
  Dumbbell,
  Loader2,
  Pencil,
  Plus,
  Repeat,
  UserCheck,
  UserMinus,
  UserX,
} from "lucide-react";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import { logActivity, startTiming } from "@/lib/log-activity";
import { initialsOf, goalLabel, formatDate } from "@/lib/format";
import { useIsMobile } from "@/lib/hooks/use-is-mobile";
import { isCardioGroup } from "@/lib/client-exercise-target";
import { MEASUREMENT_FIELDS, type MeasurementKey } from "@/lib/types/progress";
import type { ExerciseProgressSummary, ProgressMeasurement } from "@/lib/types/progress";
import type { CompletedSessionRow } from "@/lib/types/client-panel";
import type { CalendarAssignment } from "@/lib/calendar-logic";
import type {
  ClientProfile as ClientProfileType,
  ClientTrainingAssignment,
  ClientDietPlanAssignment,
} from "@/lib/types/client";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  FloatingSheet,
  FloatingSheetContent,
  FloatingSheetHeader,
  FloatingSheetTitle,
  FloatingSheetDescription,
  FloatingSheetBody,
} from "@/components/ui/floating-sheet";
import { ProgressLineChart } from "@/components/trainer/progress-line-chart";
import { EditClientDialog } from "@/components/trainer/edit-client-dialog";
import { AddMeasurementDialog } from "@/components/trainer/add-measurement-dialog";
import { EditMeasurementDialog } from "@/components/trainer/edit-measurement-dialog";
import { MeasurementEntriesTable } from "@/components/trainer/measurement-entries-table";
import { TrainerSessionDetailSheetContent } from "@/components/trainer/trainer-session-detail-sheet-content";
import { ClientAttendanceCalendar } from "@/components/trainer/client-attendance-calendar";
import { TrainerExerciseHistorySheetContent } from "@/components/trainer/trainer-exercise-history-sheet-content";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  ChangeAssignmentDialog,
  type ChangeAssignmentTarget,
  type DietPlanOption,
  type ProgramOption,
} from "@/components/trainer/change-assignment-dialog";

function formatDuration(seconds: number | null): string {
  if (!seconds) return "";
  const m = Math.round(seconds / 60);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem > 0 ? `${h} h ${rem} min` : `${h} h`;
}

export function ClientProfile({
  trainerId,
  client,
  measurements,
  exerciseSummaries,
  completedSessions,
  trainingAssignments,
  dietPlanAssignments,
  assignments,
  programs,
  dietPlans,
}: {
  trainerId: string;
  client: ClientProfileType;
  measurements: ProgressMeasurement[];
  exerciseSummaries: ExerciseProgressSummary[];
  completedSessions: CompletedSessionRow[];
  trainingAssignments: ClientTrainingAssignment[];
  dietPlanAssignments: ClientDietPlanAssignment[];
  /** Agenda completa del cliente (programa + semanas + reemplazos) —
   * solo para la pestaña Asistencia, que necesita saber qué tenía
   * programado cada día, no solo lo que completó. */
  assignments: CalendarAssignment[];
  /** Programas y planes del entrenador — para el modal de cambiar la
   * asignación del cliente sin desasignarlo. */
  programs: ProgramOption[];
  dietPlans: DietPlanOption[];
}) {
  const router = useRouter();
  const isMobile = useIsMobile();
  const [status, setStatus] = React.useState(client.status);
  const [togglingStatus, setTogglingStatus] = React.useState(false);
  const [removeOpen, setRemoveOpen] = React.useState(false);
  const [removing, setRemoving] = React.useState(false);
  const [editOpen, setEditOpen] = React.useState(false);
  const [addMeasurementOpen, setAddMeasurementOpen] = React.useState(false);
  const [editingMeasurement, setEditingMeasurement] =
    React.useState<ProgressMeasurement | null>(null);
  const [metric, setMetric] = React.useState<MeasurementKey>("weight_kg");
  const [openSession, setOpenSession] = React.useState<CompletedSessionRow | null>(null);
  const [openExercise, setOpenExercise] = React.useState<ExerciseProgressSummary | null>(null);
  const [changeTarget, setChangeTarget] = React.useState<ChangeAssignmentTarget | null>(null);
  const [healthNotes, setHealthNotes] = React.useState(client.health_notes ?? "");
  const [editingNotes, setEditingNotes] = React.useState(false);
  const [notesDraft, setNotesDraft] = React.useState("");
  const [savingNotes, setSavingNotes] = React.useState(false);
  const programAssignments = React.useMemo(
    () => trainingAssignments.filter((a) => a.is_program),
    [trainingAssignments],
  );

  function handleSessionClick(session: CompletedSessionRow) {
    if (isMobile) {
      router.push(`/entrenador/clientes/${client.id}/sesiones/${session.id}`);
    } else {
      setOpenSession(session);
    }
  }

  function handleExerciseClick(summary: ExerciseProgressSummary) {
    if (isMobile) {
      router.push(
        `/entrenador/clientes/${client.id}/ejercicio/${summary.exercise_id}?name=${encodeURIComponent(summary.exercise_name)}&muscle=${encodeURIComponent(summary.muscle_group)}`,
      );
    } else {
      setOpenExercise(summary);
    }
  }

  async function handleSaveHealthNotes() {
    const next = notesDraft.trim();
    setSavingNotes(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("profiles")
      .update({ health_notes: next || null })
      .eq("id", client.id);
    setSavingNotes(false);
    if (error) {
      toast.error("No se pudo guardar — intenta de nuevo");
      return;
    }
    setHealthNotes(next);
    setEditingNotes(false);
    toast.success("Notas de salud actualizadas");
    router.refresh();
  }

  async function toggleStatus() {
    const next = status === "active" ? "inactive" : "active";
    const startedAt = startTiming();
    setTogglingStatus(true);
    const supabase = createClient();
    let { error } = await supabase
      .from("profiles")
      .update({ status: next })
      .eq("id", client.id);
    // Si la pestaña estuvo abierta y sin foco un rato, el token de
    // sesión pudo expirar (Supabase solo lo refresca solo mientras la
    // pestaña está visible) — se refresca a mano y se reintenta una vez
    // antes de darlo por fallido de verdad.
    if (error && (error.code === "PGRST301" || /JWT|token/i.test(error.message))) {
      const { error: refreshError } = await supabase.auth.refreshSession();
      if (!refreshError) {
        ({ error } = await supabase
          .from("profiles")
          .update({ status: next })
          .eq("id", client.id));
      }
    }
    setTogglingStatus(false);
    if (error) {
      logActivity({
        action: "trainer.client_status_change_failed",
        category: "trainer",
        severity: "error",
        message: `No se pudo ${next === "active" ? "reactivar" : "desactivar"} a ${client.full_name}`,
        targetType: "profile",
        targetId: client.id,
        targetLabel: client.full_name,
        startedAt,
        context: { attemptedStatus: next, errorCode: error.code, reason: error.message },
      });
      toast.error("No se pudo actualizar el estado — recarga la página e intenta de nuevo");
      return;
    }
    setStatus(next);
    logActivity({
      action: next === "active" ? "trainer.client_reactivated" : "trainer.client_deactivated",
      category: "trainer",
      severity: "success",
      message: `${next === "active" ? "Reactivó" : "Desactivó"} a ${client.full_name}`,
      targetType: "profile",
      targetId: client.id,
      targetLabel: client.full_name,
      startedAt,
    });
    toast.success(next === "active" ? "Cliente reactivado" : "Cliente desactivado");
    router.refresh();
  }

  // "Desactivar" solo apaga un badge — el cliente sigue siendo tuyo y
  // no puede unirse a otro entrenador. Esto de verdad lo suelta: se
  // borran la rutina/programa y el plan nutricional que le tenías
  // asignados (su historial de sesiones/progreso se queda intacto, es
  // suyo) y trainer_id vuelve a null, para que un enlace de invitación
  // de OTRO entrenador ya lo pueda tomar.
  async function handleUnassign() {
    const startedAt = startTiming();
    setRemoving(true);
    const supabase = createClient();
    const { error } = await supabase.rpc("unassign_client", { p_client_id: client.id });
    setRemoving(false);
    if (error) {
      logActivity({
        action: "trainer.client_unassign_failed",
        category: "trainer",
        severity: "error",
        message: `No se pudo quitar a ${client.full_name}`,
        targetType: "profile",
        targetId: client.id,
        targetLabel: client.full_name,
        startedAt,
        context: { reason: error.message },
      });
      toast.error("No se pudo quitar al cliente. Intenta de nuevo.");
      return;
    }
    logActivity({
      action: "trainer.client_unassigned",
      category: "trainer",
      severity: "warning",
      message: `Quitó a ${client.full_name} (se le borraron rutina y plan nutricional asignados)`,
      targetType: "profile",
      targetId: client.id,
      targetLabel: client.full_name,
      startedAt,
    });
    toast.success("Cliente removido — ya puede unirse a otro entrenador");
    router.push("/entrenador/clientes");
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
            size="sm"
            aria-label="Editar información"
            onClick={() => setEditOpen(true)}
          >
            <Pencil />
            <span className="hidden md:inline">Editar información</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
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
            <span className="hidden md:inline">
              {status === "active" ? "Desactivar cliente" : "Reactivar cliente"}
            </span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            aria-label="Quitar cliente"
            onClick={() => setRemoveOpen(true)}
            className="text-destructive hover:text-destructive"
          >
            <UserMinus />
            <span className="hidden md:inline">Quitar cliente</span>
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

          <div className="flex flex-col gap-3">
            <h2 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              Asignado
            </h2>
            {programAssignments.length === 0 && dietPlanAssignments.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Todavía no tiene ningún programa ni plan nutricional asignado.
              </p>
            ) : (
              <>
                {programAssignments.map((assignment) => (
                  <div
                    key={assignment.id}
                    className="relative flex items-center gap-3 rounded-xl border border-border/80 p-4 transition-colors hover:border-primary/40"
                  >
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/12 text-primary">
                      <CalendarRange className="size-5" />
                    </div>
                    <Link
                      href={`/entrenador/programas/${assignment.program_id}`}
                      className="min-w-0 flex-1"
                    >
                      <p className="truncate text-sm font-semibold">{assignment.program_name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {`Programa · ${assignment.program_duration_weeks} ${assignment.program_duration_weeks === 1 ? "semana" : "semanas"}`}
                        {" · desde el "}
                        {formatDate(assignment.start_date)}
                      </p>
                    </Link>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label="Cambiar de programa"
                          className="relative z-10 shrink-0 text-muted-foreground hover:text-foreground"
                          onClick={() =>
                            setChangeTarget({
                              kind: "program",
                              assignmentId: assignment.id,
                              currentId: assignment.program_id ?? "",
                              currentName: assignment.program_name ?? "",
                            })
                          }
                        >
                          <Repeat className="size-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="top">Cambiar de programa</TooltipContent>
                    </Tooltip>
                  </div>
                ))}
                {dietPlanAssignments.map((assignment) => (
                  <div
                    key={assignment.id}
                    className="relative flex items-center gap-3 rounded-xl border border-border/80 p-4 transition-colors hover:border-primary/40"
                  >
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/12 text-primary">
                      <Apple className="size-5" />
                    </div>
                    <Link
                      href={`/entrenador/nutricion/planes/${assignment.diet_plan_id}`}
                      className="min-w-0 flex-1"
                    >
                      <p className="truncate text-sm font-semibold">{assignment.diet_plan_name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        Plan nutricional · desde el {formatDate(assignment.start_date)}
                      </p>
                    </Link>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label="Cambiar de plan nutricional"
                          className="relative z-10 shrink-0 text-muted-foreground hover:text-foreground"
                          onClick={() =>
                            setChangeTarget({
                              kind: "diet",
                              assignmentId: assignment.id,
                              currentId: assignment.diet_plan_id,
                              currentName: assignment.diet_plan_name,
                            })
                          }
                        >
                          <Repeat className="size-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="top">Cambiar de plan nutricional</TooltipContent>
                    </Tooltip>
                  </div>
                ))}
              </>
            )}
          </div>

          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle className="text-sm">Notas de salud</CardTitle>
              {!editingNotes && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setNotesDraft(healthNotes);
                    setEditingNotes(true);
                  }}
                >
                  <Pencil />
                  {healthNotes ? "Editar" : "Agregar nota de salud"}
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {editingNotes ? (
                <div className="flex flex-col gap-2">
                  <Textarea
                    autoFocus
                    rows={4}
                    value={notesDraft}
                    onChange={(e) => setNotesDraft(e.target.value)}
                    placeholder="Alergias, lesiones, condiciones a tener en cuenta al entrenar…"
                  />
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      disabled={savingNotes}
                      onClick={handleSaveHealthNotes}
                    >
                      {savingNotes ? <Loader2 className="animate-spin" /> : null}
                      Guardar
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={savingNotes}
                      onClick={() => setEditingNotes(false)}
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              ) : healthNotes ? (
                <p className="text-sm whitespace-pre-wrap text-muted-foreground">{healthNotes}</p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Sin notas de salud todavía.
                </p>
              )}
            </CardContent>
          </Card>

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

        {/* Columna derecha: historial de rutinas y evolución de ejercicios. */}
        <div>
          <Tabs defaultValue="historial">
            <TabsList>
              <TabsTrigger value="historial">Historial</TabsTrigger>
              <TabsTrigger value="asistencia">Asistencia</TabsTrigger>
              <TabsTrigger value="evolucion">Evolución</TabsTrigger>
            </TabsList>

            <TabsContent value="historial" className="mt-3">
              {completedSessions.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center gap-2 py-10 text-center text-muted-foreground">
                    <CalendarClock className="size-6" />
                    <p className="text-sm">Este cliente todavía no ha completado ninguna rutina.</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="overflow-x-auto rounded-lg border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-foreground/[0.02] text-left text-xs text-muted-foreground uppercase">
                        <th className="px-3 py-2 font-medium">Rutina</th>
                        <th className="px-3 py-2 font-medium">Fecha</th>
                        <th className="px-3 py-2 font-medium">Duración</th>
                        <th className="px-3 py-2 font-medium">Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {completedSessions.map((session) => (
                        <tr
                          key={session.id}
                          className="cursor-pointer border-b last:border-0 hover:bg-accent/40"
                          onClick={() => handleSessionClick(session)}
                        >
                          <td className="px-3 py-2 font-medium">{session.routineName}</td>
                          <td className="px-3 py-2 text-muted-foreground">{formatDate(session.sessionDate)}</td>
                          <td className="px-3 py-2 tabular-nums text-muted-foreground">
                            {session.durationSeconds ? formatDuration(session.durationSeconds) : "—"}
                          </td>
                          <td className="px-3 py-2">
                            {session.incompleteMuscleGroups.length === 0 ? (
                              <Badge variant="secondary">Completa</Badge>
                            ) : (
                              <Badge
                                variant="warning"
                                title={`Le faltó: ${session.incompleteMuscleGroups.join(", ")}`}
                              >
                                Le faltó {session.incompleteMuscleGroups.join(", ")}
                              </Badge>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </TabsContent>

            <TabsContent value="asistencia" className="mt-3">
              <ClientAttendanceCalendar
                clientId={client.id}
                completedSessions={completedSessions}
                assignments={assignments}
              />
            </TabsContent>

            <TabsContent value="evolucion" className="mt-3">
              {exerciseSummaries.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center gap-2 py-10 text-center text-muted-foreground">
                    <Dumbbell className="size-6" />
                    <p className="text-sm">
                      Este cliente todavía no tiene ejercicios registrados.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="overflow-x-auto rounded-lg border">
                  <table className="w-full text-sm">
                    <thead>
                      {/* "Inicial"/"Actual" en vez de "Peso ...": la misma
                          tabla lista fuerza (kg) y cardio (min). */}
                      <tr className="border-b bg-foreground/[0.02] text-left text-xs text-muted-foreground uppercase">
                        <th className="px-3 py-2 font-medium">Ejercicio</th>
                        <th className="px-3 py-2 font-medium">Inicial</th>
                        <th className="px-3 py-2 font-medium">Actual</th>
                      </tr>
                    </thead>
                    <tbody>
                      {exerciseSummaries.map((summary) => (
                        <tr
                          key={summary.exercise_id}
                          className="cursor-pointer border-b last:border-0 hover:bg-accent/40"
                          onClick={() => handleExerciseClick(summary)}
                        >
                          <td className="px-3 py-2 font-medium">{summary.exercise_name}</td>
                          <td className="px-3 py-2 tabular-nums text-muted-foreground">
                            {summary.starting_weight} {summary.unit}
                          </td>
                          {/* Sin columna de ojo: la fila entera ya abre la
                              evolución del ejercicio. */}
                          <td className="px-3 py-2 tabular-nums font-medium">
                            {summary.current_weight} {summary.unit}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <ConfirmDialog
        open={removeOpen}
        onOpenChange={setRemoveOpen}
        title={`¿Quitar a ${client.full_name}?`}
        description="Deja de ser tu cliente y ya no vas a ver su información aquí. Se borran la rutina/programa y el plan nutricional que le tienes asignados — su historial de sesiones, progreso y fotos se conserva, es suyo. Va a poder unirse a otro entrenador con un nuevo enlace de invitación. Esta acción no se puede deshacer."
        confirmLabel="Quitar cliente"
        loading={removing}
        onConfirm={handleUnassign}
      />

      <EditClientDialog open={editOpen} onOpenChange={setEditOpen} client={client} />

      <ChangeAssignmentDialog
        target={changeTarget}
        onOpenChange={(open) => !open && setChangeTarget(null)}
        clientId={client.id}
        clientName={client.full_name}
        trainerId={trainerId}
        programs={programs}
        dietPlans={dietPlans}
        onChanged={() => router.refresh()}
      />

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

      <FloatingSheet open={openSession !== null} onOpenChange={(open) => !open && setOpenSession(null)}>
        <FloatingSheetContent>
          <FloatingSheetHeader>
            <FloatingSheetTitle>{openSession?.routineName}</FloatingSheetTitle>
            <FloatingSheetDescription>
              {openSession ? formatDate(openSession.sessionDate) : ""}
            </FloatingSheetDescription>
          </FloatingSheetHeader>
          <FloatingSheetBody>
            {openSession ? (
              <TrainerSessionDetailSheetContent clientId={client.id} sessionId={openSession.id} />
            ) : null}
          </FloatingSheetBody>
        </FloatingSheetContent>
      </FloatingSheet>

      <FloatingSheet open={openExercise !== null} onOpenChange={(open) => !open && setOpenExercise(null)}>
        <FloatingSheetContent>
          <FloatingSheetHeader>
            <FloatingSheetTitle>{openExercise?.exercise_name}</FloatingSheetTitle>
            <FloatingSheetDescription>
              {openExercise && isCardioGroup(openExercise.muscle_group)
                ? "Evolución de minutos y nivel"
                : "Evolución de peso y repeticiones"}
            </FloatingSheetDescription>
          </FloatingSheetHeader>
          <FloatingSheetBody>
            {openExercise ? (
              <TrainerExerciseHistorySheetContent
                clientId={client.id}
                exerciseId={openExercise.exercise_id}
                cardio={isCardioGroup(openExercise.muscle_group)}
              />
            ) : null}
          </FloatingSheetBody>
        </FloatingSheetContent>
      </FloatingSheet>
    </div>
  );
}
