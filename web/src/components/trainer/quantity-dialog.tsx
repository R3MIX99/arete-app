"use client";

import * as React from "react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/** Diálogo genérico para pedir una cantidad en gramos. */
export function QuantityDialog({
  open,
  onOpenChange,
  itemName,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemName: string;
  onConfirm: (grams: number) => void;
}) {
  const [grams, setGrams] = React.useState<number | "">(100);

  React.useEffect(() => {
    if (open) setGrams(100);
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Cantidad</DialogTitle>
          <DialogDescription>{itemName}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="grams">Gramos</Label>
            <Input
              id="grams"
              type="number"
              min={1}
              autoFocus
              value={grams}
              onChange={(e) =>
                setGrams(e.target.value === "" ? "" : Number(e.target.value))
              }
            />
          </div>
          <Button
            type="button"
            disabled={grams === "" || grams <= 0}
            onClick={() => onConfirm(grams === "" ? 0 : grams)}
          >
            Agregar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
