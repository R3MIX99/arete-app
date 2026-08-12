"use client";

import * as React from "react";
import { Search, Dumbbell } from "lucide-react";

import { muscleGroupLabel, equipmentLabel } from "@/lib/format";
import type { ExerciseOption } from "@/lib/types/routine";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export function ExercisePickerDialog({
  open,
  onOpenChange,
  exercises,
  onPick,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exercises: ExerciseOption[];
  onPick: (exercise: ExerciseOption) => void;
}) {
  const [query, setQuery] = React.useState("");

  const filtered = exercises.filter((e) =>
    e.name.toLowerCase().includes(query.trim().toLowerCase()),
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Agregar ejercicio</DialogTitle>
        </DialogHeader>
        <div className="relative">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar ejercicio por nombre"
            className="pl-9"
          />
        </div>
        <div className="flex max-h-80 flex-col gap-1.5 overflow-y-auto">
          {filtered.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {exercises.length === 0
                ? "Todavía no tienes ejercicios en tu biblioteca."
                : "Ningún ejercicio coincide con la búsqueda."}
            </p>
          ) : (
            filtered.map((exercise) => (
              <button
                key={exercise.id}
                type="button"
                onClick={() => {
                  onPick(exercise);
                  onOpenChange(false);
                  setQuery("");
                }}
                className="flex items-center gap-3 rounded-lg border border-transparent px-3 py-2 text-left transition-colors hover:border-border hover:bg-accent"
              >
                <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/12 text-primary">
                  <Dumbbell className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{exercise.name}</p>
                  <div className="mt-0.5 flex gap-1.5">
                    <Badge variant="secondary" className="text-[10px]">
                      {muscleGroupLabel(exercise.muscle_group)}
                    </Badge>
                    <Badge variant="secondary" className="text-[10px]">
                      {equipmentLabel(exercise.equipment)}
                    </Badge>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
