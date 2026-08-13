"use client";

import * as React from "react";
import { Search, ClipboardList } from "lucide-react";

import { levelLabel } from "@/lib/format";
import type { RoutineOption } from "@/lib/types/program";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export function RoutinePickerDialog({
  open,
  onOpenChange,
  routines,
  onPick,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  routines: RoutineOption[];
  onPick: (routine: RoutineOption) => void;
}) {
  const [query, setQuery] = React.useState("");

  const filtered = routines.filter((r) =>
    r.name.toLowerCase().includes(query.trim().toLowerCase()),
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Elegir rutina</DialogTitle>
        </DialogHeader>
        <div className="relative">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar rutina por nombre"
            className="pl-9"
          />
        </div>
        <div className="flex max-h-80 flex-col gap-1.5 overflow-y-auto">
          {filtered.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {routines.length === 0
                ? "Todavía no tienes rutinas en tu biblioteca."
                : "Ninguna rutina coincide con la búsqueda."}
            </p>
          ) : (
            filtered.map((routine) => (
              <button
                key={routine.id}
                type="button"
                onClick={() => {
                  onPick(routine);
                  onOpenChange(false);
                  setQuery("");
                }}
                className="flex items-center gap-3 rounded-lg border border-transparent px-3 py-2 text-left transition-colors hover:border-border hover:bg-accent"
              >
                <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/12 text-primary">
                  <ClipboardList className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{routine.name}</p>
                  <Badge variant="secondary" className="mt-0.5 text-[10px]">
                    {levelLabel(routine.level)}
                  </Badge>
                </div>
              </button>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
