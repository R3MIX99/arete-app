"use client";

import * as React from "react";
import Link from "next/link";
import { Search, Plus, Apple } from "lucide-react";

import type { DietPlanSummary } from "@/lib/types/nutrition";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { MobileFab } from "@/components/trainer/mobile-fab";

export function DietPlansBrowser({ dietPlans }: { dietPlans: DietPlanSummary[] }) {
  const [query, setQuery] = React.useState("");

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return dietPlans;
    return dietPlans.filter((plan) => plan.name.toLowerCase().includes(q));
  }, [dietPlans, query]);

  return (
    <div className="flex flex-col gap-6 pt-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-xs">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar plan por nombre"
            className="pl-9"
          />
        </div>
        <Button asChild className="ml-auto hidden md:inline-flex">
          <Link href="/entrenador/nutricion/planes/nuevo">
            <Plus />
            Nuevo plan
          </Link>
        </Button>
      </div>

      <MobileFab href="/entrenador/nutricion/planes/nuevo" icon={Plus} label="Nuevo plan" />

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-16 text-center text-muted-foreground">
          <Apple className="size-8" />
          <p className="text-sm">
            {dietPlans.length === 0
              ? "Todavía no tienes planes nutricionales."
              : "Ningún plan coincide con la búsqueda."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((plan) => (
            <Link key={plan.id} href={`/entrenador/nutricion/planes/${plan.id}`}>
              <Card className="h-full card-hover-glow transition-colors hover:border-primary/40">
                <CardContent className="flex h-full flex-col gap-3">
                  <div className="flex size-10 items-center justify-center rounded-full bg-primary/12 text-primary">
                    <Apple className="size-[18px]" />
                  </div>
                  <div className="mt-auto">
                    <p className="truncate text-sm font-semibold">{plan.name}</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {plan.daily_calorie_target && (
                        <Badge variant="secondary">
                          {Math.round(plan.daily_calorie_target)} kcal/día
                        </Badge>
                      )}
                      {plan.goal_label && <Badge variant="secondary">{plan.goal_label}</Badge>}
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
