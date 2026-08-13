"use client";

import * as React from "react";
import { Search, Users } from "lucide-react";

import { initialsOf } from "@/lib/format";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface ClientOption {
  id: string;
  full_name: string;
}

export function ClientPickerDialog({
  open,
  onOpenChange,
  clients,
  onPick,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clients: ClientOption[];
  onPick: (client: ClientOption) => void;
}) {
  const [query, setQuery] = React.useState("");

  React.useEffect(() => {
    if (open) setQuery("");
  }, [open]);

  const filtered = clients.filter((c) =>
    c.full_name.toLowerCase().includes(query.trim().toLowerCase()),
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Elegir cliente</DialogTitle>
        </DialogHeader>
        <div className="relative">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar cliente por nombre"
            className="pl-9"
          />
        </div>
        <div className="flex max-h-80 flex-col gap-1.5 overflow-y-auto">
          {filtered.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {clients.length === 0 ? (
                <span className="flex flex-col items-center gap-2">
                  <Users className="size-6" />
                  Todavía no tienes clientes activos.
                </span>
              ) : (
                "Ningún cliente coincide con la búsqueda."
              )}
            </p>
          ) : (
            filtered.map((client) => (
              <button
                key={client.id}
                type="button"
                onClick={() => {
                  onPick(client);
                  onOpenChange(false);
                  setQuery("");
                }}
                className="flex items-center gap-3 rounded-lg border border-transparent px-3 py-2 text-left transition-colors hover:border-border hover:bg-accent"
              >
                <Avatar className="size-8">
                  <AvatarFallback className="text-xs">
                    {initialsOf(client.full_name) || "?"}
                  </AvatarFallback>
                </Avatar>
                <p className="truncate text-sm font-medium">{client.full_name}</p>
              </button>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
