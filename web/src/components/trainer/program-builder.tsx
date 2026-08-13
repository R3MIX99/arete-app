"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
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
import { ProgramSlotDialog } from "@/components/trainer/program-slot-dialog";
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
  const [routinePickerOpen, setRoutinePickerOpen] = React.useState(false);
  const [pendingRoutine, setPendingRoutine] = React.useState<RoutineOption | null>(null);
  const [addingSlot, setAddingSlot] = React.useState(false);
  const [removingSlotId, setRemovingSlotId] = React.useState<string | null>(null);
  const [assignOpen, setAssignOpen] = React.useState(false);
  const [overridesForAssignment, setOverridesForAssignment] =
    React.useState<ProgramAssignment | null>(null);

  const weeks = React.useMemo(
    () => Array.from({ length: program.duration_weeks }, (_, i) => i + 1),
    [program.duration_weeks],
  );

  async function handleAddSlot(weekNumber: number, dayOfWeek: number) {
    if (!pendingRoutine) return;
    setAddingSlot(true);
    const supabase = createClient();
    const { error } = await supabase.from("program_routines").insert({
      program_id: program.id,
      routine_id: pendingRoutine.id,
      week_number: weekNumber,
      day_of_week: dayOfWeek,
    });
    setAddingSlot(false);
    if (error) {
      toast.error("No se pudo agregar la rutina");
      return;
    }
    toast.success("Rutina agregada al programa");
    setPendingRoutine(null);
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
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 p-4 md:p-8">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" className="w-fit" asChild>
          <Link href="/entrenador/programas">
            <ArrowLeft /> Volver a programas
          </Link>
        </Button>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={() => setEditOpen(true)}>
            <Pencil /> Editar información
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash /> Eliminar
          </Button>
        </div>
      </div>

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
          onClick={() => setRoutinePickerOpen(true)}
        >
          <Plus /> Agregar rutina
        </Button>
      </div>

      <div className="flex flex-col gap-3">
        {weeks.map((week) => {
          const weekSlots = slotsByWeek.get(week) ?? [];
          return (
            <Card key={week}>
              <CardHeader>
                <CardTitle className="text-sm">Semana {week}</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-1.5">
                {[1, 2, 3, 4, 5, 6, 7].map((day) => {
                  const daySlots = weekSlots.filter((s) => s.day_of_week === day);
                  return (
                    <div
                      key={day}
                      className="flex items-start justify-between gap-2 rounded-lg px-2 py-1.5 odd:bg-foreground/[0.02]"
                    >
                      <span className="w-20 shrink-0 pt-0.5 text-xs font-medium text-muted-foreground">
                        {weekdayLabel(day)}
                      </span>
                      {daySlots.length === 0 ? (
                        <span className="flex-1 pt-0.5 text-xs text-muted-foreground">
                          Descanso
                        </span>
                      ) : (
                        <div className="flex flex-1 flex-wrap gap-1.5">
                          {daySlots.map((slot) => (
                            <Badge
                              key={slot.id}
                              variant="outline"
                              className="gap-1.5 pr-1"
                            >
                              {slot.routine_name}
                              <button
                                type="button"
                                aria-label="Quitar rutina"
                                disabled={removingSlotId === slot.id}
                                onClick={() => handleRemoveSlot(slot.id)}
                                className="rounded-full p-0.5 hover:bg-destructive/15 hover:text-destructive"
                              >
                                {removingSlotId === slot.id ? (
                                  <Loader2 className="size-3 animate-spin" />
                                ) : (
                                  <Trash2 className="size-3" />
                                )}
                              </button>
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="mt-2 flex items-center justify-between">
        <h2 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          Clientes asignados
        </h2>
        <Button type="button" variant="outline" size="sm" onClick={() => setAssignOpen(true)}>
          <UserPlus /> Asignar a clientes
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
        open={routinePickerOpen}
        onOpenChange={setRoutinePickerOpen}
        routines={routineCatalog}
        onPick={(routine) => setPendingRoutine(routine)}
      />

      <ProgramSlotDialog
        open={pendingRoutine !== null}
        onOpenChange={(open) => !open && setPendingRoutine(null)}
        routineName={pendingRoutine?.name ?? ""}
        durationWeeks={program.duration_weeks}
        loading={addingSlot}
        onConfirm={handleAddSlot}
      />

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
