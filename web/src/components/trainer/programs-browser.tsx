"use client";

import * as React from "react";
import Link from "next/link";
import { Search, Plus, CalendarRange, FilterX } from "lucide-react";

import { goalLabel } from "@/lib/format";
import type { ProgramSummary } from "@/lib/types/program";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { MobileFab } from "@/components/trainer/mobile-fab";

export function ProgramsBrowser({ programs }: { programs: ProgramSummary[] }) {
  const [query, setQuery] = React.useState("");

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return programs;
    return programs.filter((program) => program.name.toLowerCase().includes(q));
  }, [programs, query]);

  return (
    <div className="flex w-full flex-col gap-6 p-4 pb-24 md:p-8">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-xs">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar programa por nombre"
            className="pl-9"
          />
        </div>
        <Button asChild className="ml-auto hidden md:inline-flex">
          <Link href="/entrenador/programas/nuevo">
            <Plus />
            Nuevo programa
          </Link>
        </Button>
        {query && (
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground"
            onClick={() => setQuery("")}
          >
            <FilterX /> Limpiar
          </Button>
        )}
      </div>

      <MobileFab href="/entrenador/programas/nuevo" icon={Plus} label="Nuevo programa" />

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-16 text-center text-muted-foreground">
          <CalendarRange className="size-8" />
          <p className="text-sm">
            {programs.length === 0
              ? "Todavía no tienes programas."
              : "Ningún programa coincide con la búsqueda."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((program) => (
            <Link key={program.id} href={`/entrenador/programas/${program.id}`}>
              <Card className="h-full card-hover-glow transition-colors hover:border-primary/40">
                <CardContent className="flex h-full flex-col gap-3">
                  <div className="flex size-10 items-center justify-center rounded-full bg-primary/12 text-primary">
                    <CalendarRange className="size-[18px]" />
                  </div>
                  <div className="mt-auto">
                    <p className="truncate text-sm font-semibold">{program.name}</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <Badge variant="secondary">
                        {program.duration_weeks}{" "}
                        {program.duration_weeks === 1 ? "semana" : "semanas"}
                      </Badge>
                      {program.goal && (
                        <Badge variant="secondary">{goalLabel(program.goal)}</Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
