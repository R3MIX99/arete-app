"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";

import { weekdayLabel } from "@/lib/format";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const WEEKDAYS = [1, 2, 3, 4, 5, 6, 7];

export function ProgramSlotDialog({
  open,
  onOpenChange,
  routineName,
  durationWeeks,
  loading,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  routineName: string;
  durationWeeks: number;
  loading: boolean;
  onConfirm: (weekNumber: number, dayOfWeek: number) => void;
}) {
  const weeks = React.useMemo(
    () => Array.from({ length: durationWeeks }, (_, i) => i + 1),
    [durationWeeks],
  );
  const [weekNumber, setWeekNumber] = React.useState(1);
  const [dayOfWeek, setDayOfWeek] = React.useState(1);

  React.useEffect(() => {
    if (open) {
      setWeekNumber(1);
      setDayOfWeek(1);
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Ubicar rutina</DialogTitle>
          <DialogDescription>{routineName}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>Semana</Label>
            <Select
              value={String(weekNumber)}
              onValueChange={(v) => setWeekNumber(Number(v))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {weeks.map((week) => (
                  <SelectItem key={week} value={String(week)}>
                    Semana {week}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Día</Label>
            <Select
              value={String(dayOfWeek)}
              onValueChange={(v) => setDayOfWeek(Number(v))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {WEEKDAYS.map((day) => (
                  <SelectItem key={day} value={String(day)}>
                    {weekdayLabel(day)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            type="button"
            disabled={loading}
            onClick={() => onConfirm(weekNumber, dayOfWeek)}
          >
            {loading ? <Loader2 className="animate-spin" /> : null}
            Agregar a la semana
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
