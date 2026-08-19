"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  ChevronDown,
  Copy,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  UserMinus,
  UserPlus,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import { goalLabel, weekdayLabel, formatDate, initialsOf } from "@/lib/format";
import type { ProgramAssignment, ProgramSlot, RoutineOption, SlotOverride } from "@/lib/types/program";
import type { ClientGoal, ClientProfile } from "@/lib/types/client";
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
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { RoutinePickerDialog } from "@/components/trainer/routine-picker-dialog";
import { AssignToClientsDialog } from "@/components/trainer/assign-to-clients-dialog";
import { AssignmentOverridesDialog } from "@/components/trainer/assignment-overrides-dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const GOAL_OPTIONS = [
  { value: "lose_weight", label: "Perder peso" },
  { value: "gain_muscle", label: "Ganar músculo" },
  { value: "maintenance", label: "Mantenimiento" },
  { value: "performance", label: "Rendimiento" },
];

interface ProgramDetail {
  id: string;
  name: string;
  description: string | null;
  duration_weeks: number;
  goal: ClientGoal | null;
}

interface SlotTarget {
  weekNumber: number;
  dayOfWeek: number;
}

export function ProgramBuilder({
  trainerId,
  program,
  slots,
  routineCatalog,
  clients,
  assignments,
  overridesByAssignment,
}: {
  trainerId: string;
  program: ProgramDetail;
  slots: ProgramSlot[];
  routineCatalog: RoutineOption[];
  clients: ClientProfile[];
  assignments: ProgramAssignment[];
  overridesByAssignment: Record<string, SlotOverride[]>;
}) {
  const router = useRouter();

  const [editOpen, setEditOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const [pendingSlotTarget, setPendingSlotTarget] = React.useState<SlotTarget | null>(null);
  const [addingSlot, setAddingSlot] = React.useState(false);
  const [removingSlotId, setRemovingSlotId] = React.useState<string | null>(null);
  const [assignOpen, setAssignOpen] = React.useState(false);
  const [overridesForAssignment, setOverridesForAssignment] =
    React.useState<ProgramAssignment | null>(null);
  const [unassignTarget, setUnassignTarget] = React.useState<ProgramAssignment | null>(null);
  const [unassigning, setUnassigning] = React.useState(false);
  const [openWeeks, setOpenWeeks] = React.useState<Set<number>>(() => new Set([1]));
  const [cloningFromWeek, setCloningFromWeek] = React.useState<number | null>(null);
  const [cloneTargetWeek, setCloneTargetWeek] = React.useState<string>("");
  const [cloning, setCloning] = React.useState(false);
  const [movingWeek, setMovingWeek] = React.useState<number | null>(null);
  const [weekToDelete, setWeekToDelete] = React.useState<number | null>(null);
  const [deletingWeek, setDeletingWeek] = React.useState(false);

  function toggleWeek(week: number) {
    setOpenWeeks((prev) => {
      const next = new Set(prev);
      if (next.has(week)) next.delete(week);
      else next.add(week);
      return next;
    });
  }

  const weeks = React.useMemo(
    () => Array.from({ length: program.duration_weeks }, (_, i) => i + 1),
    [program.duration_weeks],
  );

  function openRoutinePickerFor(weekNumber: number, dayOfWeek: number) {
    setPendingSlotTarget({ weekNumber, dayOfWeek });
  }

  async function handlePickRoutine(routine: RoutineOption) {
    if (!pendingSlotTarget) return;
    setAddingSlot(true);
    const supabase = createClient();
    const { error } = await supabase.from("program_routines").insert({
      program_id: program.id,
      routine_id: routine.id,
      week_number: pendingSlotTarget.weekNumber,
      day_of_week: pendingSlotTarget.dayOfWeek,
    });
    setAddingSlot(false);
    setPendingSlotTarget(null);
    if (error) {
      toast.error("No se pudo agregar la rutina");
      return;
    }
    toast.success("Rutina agregada al programa");
    router.refresh();
  }

  async function handleRemoveSlot(slotId: string) {
    setRemovingSlotId(slotId);
    const supabase = createClient();
    const { error } = await supabase.from("program_routines").delete().eq("id", slotId);
    setRemovingSlotId(null);
    if (error) {
      toast.error("No se pudo quitar la rutina");
      return;
    }
    toast.success("Rutina quitada del programa");
    router.refresh();
  }

  const [addingWeek, setAddingWeek] = React.useState(false);

  async function handleAddWeek() {
    const newWeek = program.duration_weeks + 1;
    setAddingWeek(true);
    const supabase = createClient();

    // Limpieza defensiva: si esa semana tuviera rutinas huérfanas de una
    // semana eliminada antes, la semana nueva siempre nace vacía.
    const { error: cleanupError } = await supabase
      .from("program_routines")
      .delete()
      .eq("program_id", program.id)
      .eq("week_number", newWeek);
    if (cleanupError) {
      setAddingWeek(false);
      toast.error("No se pudo agregar la semana");
      return;
    }

    const { error } = await supabase
      .from("programs")
      .update({ duration_weeks: newWeek })
      .eq("id", program.id);
    setAddingWeek(false);
    if (error) {
      toast.error("No se pudo agregar la semana");
      return;
    }
    setOpenWeeks((prev) => new Set(prev).add(newWeek));
    toast.success(`Semana ${newWeek} agregada`);
    router.refresh();
  }

  async function handleMoveWeek(week: number, direction: -1 | 1) {
    const target = week + direction;
    if (target < 1 || target > program.duration_weeks) return;
    setMovingWeek(week);
    const supabase = createClient();

    const slotsInWeek = slots.filter((s) => s.week_number === week);
    const slotsInTarget = slots.filter((s) => s.week_number === target);
    const results = await Promise.all([
      ...slotsInWeek.map((s) =>
        supabase.from("program_routines").update({ week_number: target }).eq("id", s.id),
      ),
      ...slotsInTarget.map((s) =>
        supabase.from("program_routines").update({ week_number: week }).eq("id", s.id),
      ),
    ]);
    setMovingWeek(null);
    if (results.some((r) => r.error)) {
      toast.error("No se pudo reordenar la semana");
      return;
    }
    toast.success(`Semana ${week} movida a la posición ${target}`);
    router.refresh();
  }

  async function handleDeleteWeek() {
    if (weekToDelete === null || program.duration_weeks <= 1) return;
    const week = weekToDelete;
    setDeletingWeek(true);
    const supabase = createClient();

    const { error: deleteError } = await supabase
      .from("program_routines")
      .delete()
      .eq("program_id", program.id)
      .eq("week_number", week);
    if (deleteError) {
      setDeletingWeek(false);
      toast.error("No se pudo eliminar la semana");
      return;
    }

    // Recorre una posición hacia arriba las semanas que quedaron después.
    const laterSlots = slots.filter((s) => s.week_number > week);
    const shiftResults = await Promise.all(
      laterSlots.map((s) =>
        supabase
          .from("program_routines")
          .update({ week_number: s.week_number - 1 })
          .eq("id", s.id),
      ),
    );
    if (shiftResults.some((r) => r.error)) {
      setDeletingWeek(false);
      toast.error("No se pudo eliminar la semana");
      return;
    }

    const { error: durationError } = await supabase
      .from("programs")
      .update({ duration_weeks: program.duration_weeks - 1 })
      .eq("id", program.id);
    setDeletingWeek(false);
    if (durationError) {
      toast.error("No se pudo eliminar la semana");
      return;
    }
    setWeekToDelete(null);
    toast.success(`Semana ${week} eliminada`);
    router.refresh();
  }

  async function handleCloneWeek() {
    if (cloningFromWeek === null || !cloneTargetWeek) return;
    const isNewWeek = cloneTargetWeek === "new";
    const targetWeek = isNewWeek ? program.duration_weeks + 1 : Number(cloneTargetWeek);
    const sourceSlots = slotsByWeek.get(cloningFromWeek) ?? [];
    setCloning(true);
    const supabase = createClient();

    if (isNewWeek) {
      const { error: durationError } = await supabase
        .from("programs")
        .update({ duration_weeks: targetWeek })
        .eq("id", program.id);
      if (durationError) {
        setCloning(false);
        toast.error("No se pudo clonar la semana");
        return;
      }
    }

    // Se reemplaza por completo lo que hubiera en la semana destino.
    const { error: deleteError } = await supabase
      .from("program_routines")
      .delete()
      .eq("program_id", program.id)
      .eq("week_number", targetWeek);
    if (deleteError) {
      setCloning(false);
      toast.error("No se pudo clonar la semana");
      return;
    }

    if (sourceSlots.length > 0) {
      const { error: insertError } = await supabase.from("program_routines").insert(
        sourceSlots.map((slot) => ({
          program_id: program.id,
          routine_id: slot.routine_id,
          week_number: targetWeek,
          day_of_week: slot.day_of_week,
          notes: slot.notes,
        })),
      );
      if (insertError) {
        setCloning(false);
        toast.error("No se pudo clonar la semana");
        return;
      }
    }

    setCloning(false);
    setCloningFromWeek(null);
    setCloneTargetWeek("");
    setOpenWeeks((prev) => new Set(prev).add(targetWeek));
    toast.success(`Semana ${cloningFromWeek} clonada a la semana ${targetWeek}`);
    router.refresh();
  }

  async function handleDeleteProgram() {
    setDeleting(true);
    const supabase = createClient();
    const { error } = await supabase.from("programs").delete().eq("id", program.id);
    if (error) {
      toast.error("No se pudo eliminar el programa");
      setDeleting(false);
      setDeleteOpen(false);
      return;
    }
    toast.success("Programa eliminado");
    router.push("/entrenador/programas");
    router.refresh();
  }

  async function handleUnassign() {
    if (!unassignTarget) return;
    setUnassigning(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("client_assignments")
      .delete()
      .eq("id", unassignTarget.id);
    setUnassigning(false);
    if (error) {
      toast.error("No se pudo desasignar al cliente");
      return;
    }
    toast.success(`Se desasignó a ${unassignTarget.client_name}`);
    setUnassignTarget(null);
    router.refresh();
  }

  // Nota: sin React.useMemo — el React Compiler no lograba preservar la
  // memoización manual aquí (bailout en otra parte del componente) y
  // marcaba error; el cálculo es barato y el compilador igual lo optimiza.
  const slotsByWeek = new Map<number, ProgramSlot[]>();
  for (const slot of slots) {
    slotsByWeek.set(slot.week_number, [...(slotsByWeek.get(slot.week_number) ?? []), slot]);
  }

  const assignedClientIds = assignments.map((a) => a.client_id);

  return (
    <div className="flex w-full flex-col gap-4 p-4 pb-24 md:p-8">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" className="w-fit" asChild>
          <Link href="/entrenador/programas">
            <ArrowLeft /> Volver a programas
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
            aria-label="Eliminar programa"
            className="text-destructive hover:text-destructive"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 />
            <span className="hidden md:inline">Eliminar programa</span>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-[1fr_20rem] md:items-start">
        {/* Columna izquierda: info del programa + semanas. */}
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle>{program.name}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <div className="flex flex-wrap gap-1.5">
                <Badge variant="secondary">
                  {program.duration_weeks}{" "}
                  {program.duration_weeks === 1 ? "semana" : "semanas"}
                </Badge>
                {program.goal && <Badge variant="secondary">{goalLabel(program.goal)}</Badge>}
              </div>
              {program.description && (
                <p className="text-sm text-muted-foreground">{program.description}</p>
              )}
            </CardContent>
          </Card>

          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              Semanas
            </h2>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={addingWeek}
              onClick={handleAddWeek}
            >
              {addingWeek ? <Loader2 className="animate-spin" /> : <Plus />}
              Agregar semana
            </Button>
          </div>

          <div className="flex flex-col gap-3">
            {weeks.map((week) => {
              const weekSlots = slotsByWeek.get(week) ?? [];
              const isOpen = openWeeks.has(week);
              const filledDays = new Set(weekSlots.map((s) => s.day_of_week)).size;
              return (
                <Card key={week}>
                  <div className="flex flex-col gap-2 px-5 py-3 md:flex-row md:items-center md:justify-between md:gap-2 md:py-0">
                    <button
                      type="button"
                      onClick={() => toggleWeek(week)}
                      className="flex items-center justify-between gap-2 py-0 text-left md:flex-1"
                    >
                      <div className="flex flex-col gap-1">
                        <CardTitle className="text-sm">Semana {week}</CardTitle>
                        <p className="text-xs text-muted-foreground">
                          {filledDays === 0
                            ? "Sin rutinas"
                            : `${filledDays} ${filledDays === 1 ? "día" : "días"} con rutina`}
                        </p>
                      </div>
                      <ChevronDown
                        className={`size-4 shrink-0 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`}
                      />
                    </button>
                    <div className="flex shrink-0 items-center justify-end gap-0.5">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label="Subir semana"
                        disabled={week === 1 || movingWeek !== null}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMoveWeek(week, -1);
                        }}
                      >
                        {movingWeek === week ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <ArrowUp className="size-4" />
                        )}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label="Bajar semana"
                        disabled={week === program.duration_weeks || movingWeek !== null}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMoveWeek(week, 1);
                        }}
                      >
                        <ArrowDown className="size-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label="Clonar semana"
                        className="md:w-auto md:px-3"
                        disabled={filledDays === 0}
                        onClick={(e) => {
                          e.stopPropagation();
                          setCloningFromWeek(week);
                          setCloneTargetWeek("");
                        }}
                      >
                        <Copy className="size-4" />
                        <span className="hidden md:inline">Clonar semana</span>
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label="Eliminar semana"
                        className="text-destructive hover:text-destructive"
                        disabled={program.duration_weeks <= 1}
                        onClick={(e) => {
                          e.stopPropagation();
                          setWeekToDelete(week);
                        }}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </div>
                  <CardContent
                    className={`${isOpen ? "flex" : "hidden"} flex-col gap-1.5`}
                  >
                    {[1, 2, 3, 4, 5, 6, 7].map((day) => {
                      const daySlots = weekSlots.filter((s) => s.day_of_week === day);
                      return (
                        <div
                          key={day}
                          className="flex flex-col gap-2 rounded-lg px-2 py-3 md:flex-row md:items-start md:justify-between md:gap-3 md:py-2.5 md:odd:bg-foreground/[0.02]"
                        >
                          <span className="text-sm font-semibold md:w-24 md:shrink-0 md:pt-1.5 md:text-xs md:font-medium md:text-muted-foreground">
                            {weekdayLabel(day)}
                          </span>

                          {/* Rutinas del día — apiladas y con toque grande en cualquier tamaño de pantalla. */}
                          <div className="flex flex-col gap-1.5 md:flex-1 md:flex-row md:flex-wrap md:items-center">
                            {daySlots.length === 0 ? (
                              <span className="text-xs text-muted-foreground md:pt-1.5">
                                Descanso
                              </span>
                            ) : (
                              daySlots.map((slot) => (
                                <Badge
                                  key={slot.id}
                                  variant="outline"
                                  className="w-fit gap-2 py-1.5 pr-1.5 pl-3 text-sm"
                                >
                                  {slot.routine_name}
                                  <button
                                    type="button"
                                    aria-label="Quitar rutina"
                                    disabled={removingSlotId === slot.id}
                                    onClick={() => handleRemoveSlot(slot.id)}
                                    className="rounded-full p-1.5 hover:bg-destructive/15 hover:text-destructive"
                                  >
                                    {removingSlotId === slot.id ? (
                                      <Loader2 className="size-4 animate-spin" />
                                    ) : (
                                      <Trash2 className="size-4" />
                                    )}
                                  </button>
                                </Badge>
                              ))
                            )}

                            <button
                              type="button"
                              onClick={() => openRoutinePickerFor(week, day)}
                              className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary active:scale-[0.98] active:bg-accent md:w-fit md:justify-start md:px-3 md:py-1.5"
                            >
                              <Plus className="size-4" /> Agregar rutina
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Columna derecha: clientes asignados, fija al hacer scroll en escritorio. */}
        <div className="flex flex-col gap-3 md:sticky md:top-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              Clientes asignados
            </h2>
            <Button type="button" variant="outline" size="sm" onClick={() => setAssignOpen(true)}>
              <UserPlus /> Asignar
            </Button>
          </div>

          {assignments.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center gap-2 py-10 text-center text-muted-foreground">
                <Users className="size-6" />
                <p className="text-sm">Todavía no asignas este programa a ningún cliente.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="flex flex-col gap-2">
              {assignments.map((assignment) => (
                <div
                  key={assignment.id}
                  className="flex items-center gap-1 rounded-lg border pr-1 transition-colors hover:border-primary/40"
                >
                  <button
                    type="button"
                    onClick={() => setOverridesForAssignment(assignment)}
                    className="flex min-w-0 flex-1 items-center gap-3 px-3 py-2 text-left hover:bg-accent"
                  >
                    <Avatar className="size-9">
                      <AvatarFallback className="text-xs">
                        {initialsOf(assignment.client_name) || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{assignment.client_name}</p>
                      <p className="text-xs text-muted-foreground">
                        Desde el {formatDate(assignment.start_date)}
                      </p>
                    </div>
                  </button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`Desasignar a ${assignment.client_name}`}
                    className="shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={() => setUnassignTarget(assignment)}
                  >
                    <UserMinus className="size-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <EditProgramInfoDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        program={program}
      />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={`¿Eliminar el programa "${program.name}"?`}
        description="Esta acción no se puede deshacer. Las asignaciones de este programa a clientes también se eliminarán."
        loading={deleting}
        onConfirm={handleDeleteProgram}
      />

      <RoutinePickerDialog
        open={pendingSlotTarget !== null}
        onOpenChange={(open) => !open && setPendingSlotTarget(null)}
        routines={routineCatalog}
        onPick={handlePickRoutine}
      />

      <ConfirmDialog
        open={weekToDelete !== null}
        onOpenChange={(open) => !open && setWeekToDelete(null)}
        title={`¿Eliminar la semana ${weekToDelete}?`}
        description="Se eliminan las rutinas de esa semana y las semanas siguientes se recorren una posición hacia arriba. Esta acción no se puede deshacer."
        loading={deletingWeek}
        onConfirm={handleDeleteWeek}
      />

      <Dialog
        open={cloningFromWeek !== null}
        onOpenChange={(open) => {
          if (!open) {
            setCloningFromWeek(null);
            setCloneTargetWeek("");
          }
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Clonar semana {cloningFromWeek}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Elige a qué semana copiar las rutinas de la semana {cloningFromWeek}. Lo que
            ya tenga esa semana se reemplaza.
          </p>
          <Select value={cloneTargetWeek} onValueChange={setCloneTargetWeek}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Elegir semana destino" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="new">
                Semana nueva ({program.duration_weeks + 1})
              </SelectItem>
              {weeks
                .filter((w) => w !== cloningFromWeek)
                .map((w) => (
                  <SelectItem key={w} value={String(w)}>
                    Semana {w}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
          <Button
            type="button"
            className="w-fit"
            disabled={!cloneTargetWeek || cloning}
            onClick={handleCloneWeek}
          >
            {cloning ? <Loader2 className="animate-spin" /> : <Copy />}
            Clonar semana
          </Button>
        </DialogContent>
      </Dialog>

      {addingSlot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20">
          <Loader2 className="size-6 animate-spin text-white" />
        </div>
      )}

      <AssignToClientsDialog
        open={assignOpen}
        onOpenChange={setAssignOpen}
        trainerId={trainerId}
        clients={clients}
        alreadyAssignedClientIds={assignedClientIds}
        programId={program.id}
        onAssigned={() => router.refresh()}
      />

      {overridesForAssignment && (
        <AssignmentOverridesDialog
          open={overridesForAssignment !== null}
          onOpenChange={(open) => !open && setOverridesForAssignment(null)}
          assignmentId={overridesForAssignment.id}
          clientName={overridesForAssignment.client_name}
          slots={slots}
          overrides={overridesByAssignment[overridesForAssignment.id] ?? []}
          routineCatalog={routineCatalog}
          onChanged={() => router.refresh()}
        />
      )}

      <ConfirmDialog
        open={unassignTarget !== null}
        onOpenChange={(open) => !open && setUnassignTarget(null)}
        title={`¿Desasignar a ${unassignTarget?.client_name ?? ""}?`}
        description="Deja de ver este programa en su panel y en su calendario. No se borra el programa ni su historial de entrenamiento ya registrado."
        loading={unassigning}
        onConfirm={handleUnassign}
      />
    </div>
  );
}

function EditProgramInfoDialog({
  open,
  onOpenChange,
  program,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  program: ProgramDetail;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar información</DialogTitle>
        </DialogHeader>
        {/* Se monta sólo mientras el diálogo está abierto: así el formulario
         * siempre arranca con los valores actuales del programa, sin
         * necesitar un efecto que sincronice el estado al abrir. */}
        {open && (
          <EditProgramInfoForm program={program} onOpenChange={onOpenChange} />
        )}
      </DialogContent>
    </Dialog>
  );
}

function EditProgramInfoForm({
  program,
  onOpenChange,
}: {
  program: ProgramDetail;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [name, setName] = React.useState(program.name);
  const [description, setDescription] = React.useState(program.description ?? "");
  const [goal, setGoal] = React.useState(program.goal ?? "");
  const [saving, setSaving] = React.useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("programs")
      .update({
        name,
        description: description || null,
        goal: goal || null,
      })
      .eq("id", program.id);
    setSaving(false);
    if (error) {
      toast.error("No se pudieron guardar los cambios");
      return;
    }
    toast.success("Cambios guardados");
    onOpenChange(false);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="edit_name">Nombre</Label>
        <Input id="edit_name" required value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="edit_goal">Objetivo (opcional)</Label>
        <Select value={goal} onValueChange={setGoal}>
          <SelectTrigger id="edit_goal">
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
        <Label htmlFor="edit_description">Descripción (opcional)</Label>
        <Textarea
          id="edit_description"
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>
      <Button type="submit" disabled={saving} className="w-fit">
        {saving ? <Loader2 className="animate-spin" /> : null}
        Guardar cambios
      </Button>
    </form>
  );
}
