"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ChevronDown,
  Copy,
  Loader2,
  Pencil,
  Plus,
  Trash,
  Trash2,
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
  const [openWeeks, setOpenWeeks] = React.useState<Set<number>>(() => new Set([1]));
  const [cloningFromWeek, setCloningFromWeek] = React.useState<number | null>(null);
  const [cloneTargetWeek, setCloneTargetWeek] = React.useState<string>("");
  const [cloning, setCloning] = React.useState(false);

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

  async function handleCloneWeek() {
    if (cloningFromWeek === null || !cloneTargetWeek) return;
    const targetWeek = Number(cloneTargetWeek);
    const sourceSlots = slotsByWeek.get(cloningFromWeek) ?? [];
    setCloning(true);
    const supabase = createClient();

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

  const slotsByWeek = React.useMemo(() => {
    const map = new Map<number, ProgramSlot[]>();
    for (const slot of slots) {
      const list = map.get(slot.week_number) ?? [];
      list.push(slot);
      map.set(slot.week_number, list);
    }
    return map;
  }, [slots]);

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

          <h2 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            Semanas
          </h2>

          <div className="flex flex-col gap-3">
            {weeks.map((week) => {
              const weekSlots = slotsByWeek.get(week) ?? [];
              const isOpen = openWeeks.has(week);
              const filledDays = new Set(weekSlots.map((s) => s.day_of_week)).size;
              return (
                <Card key={week}>
                  <div className="flex w-full items-center justify-between gap-2 px-5">
                    <button
                      type="button"
                      onClick={() => toggleWeek(week)}
                      className="flex flex-1 items-center justify-between gap-2 py-0 text-left"
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
                    {weeks.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="shrink-0"
                        disabled={filledDays === 0}
                        onClick={(e) => {
                          e.stopPropagation();
                          setCloningFromWeek(week);
                          setCloneTargetWeek("");
                        }}
                      >
                        <Copy /> Clonar semana
                      </Button>
                    )}
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
                <button
                  key={assignment.id}
                  type="button"
                  onClick={() => setOverridesForAssignment(assignment)}
                  className="flex items-center gap-3 rounded-lg border px-3 py-2 text-left transition-colors hover:border-primary/40 hover:bg-accent"
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
  const router = useRouter();
  const [name, setName] = React.useState(program.name);
  const [durationWeeks, setDurationWeeks] = React.useState(program.duration_weeks);
  const [description, setDescription] = React.useState(program.description ?? "");
  const [goal, setGoal] = React.useState(program.goal ?? "");
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setName(program.name);
      setDurationWeeks(program.duration_weeks);
      setDescription(program.description ?? "");
      setGoal(program.goal ?? "");
    }
  }, [open, program]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("programs")
      .update({
        name,
        duration_weeks: durationWeeks,
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar información</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit_name">Nombre</Label>
            <Input id="edit_name" required value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit_duration">Duración (semanas)</Label>
            <Input
              id="edit_duration"
              type="number"
              min={1}
              required
              value={durationWeeks}
              onChange={(e) => setDurationWeeks(Number(e.target.value))}
            />
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
      </DialogContent>
    </Dialog>
  );
}
