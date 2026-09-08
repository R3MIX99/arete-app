"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Clock, History, Loader2, Minus, Target } from "lucide-react";
import Link from "next/link";

import { createClient } from "@/lib/supabase/client";
import { fetchCompletedSessionView, type CompletedSessionView } from "@/lib/server/completed-session-view";
import { cn } from "@/lib/utils";
import { ExerciseVideoButton } from "@/components/client/exercise-video-button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

function isCardio(muscleGroup: string) {
  return muscleGroup === "cardio";
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return "—";
  const m = Math.round(seconds / 60);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem > 0 ? `${h} h ${rem} min` : `${h} h`;
}

/** Contenido del sheet flotante de detalle de una sesión ya completada
 * por un cliente — misma información que la página de solo lectura,
 * pero cargada en el navegador para poder mostrarse dentro del panel
 * sin navegar a otra página. Se arma a partir de lo que el cliente
 * realmente registró (client_set_logs), no de la rutina vigente — así
 * sigue viéndose igual aunque el entrenador después edite o borre esa
 * rutina.
 *
 * `title`/`subtitle` son opcionales: cuando se usa dentro del sheet de
 * Historial, el título ya lo pone el propio sheet (FloatingSheetTitle)
 * y no hace falta repetirlo aquí; en Asistencia, en cambio, se muestra
 * inline dentro de la tarjeta y sí necesita su propio encabezado. */
export function TrainerSessionDetailSheetContent({
  clientId,
  sessionId,
  title,
  subtitle,
}: {
  clientId: string;
  sessionId: string;
  title?: string;
  subtitle?: string;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<CompletedSessionView | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const data = await fetchCompletedSessionView(supabase, sessionId, clientId);
      if (cancelled) return;
      setView(data);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase, clientId, sessionId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const exercises = view?.exercises ?? [];
  const totalSets = exercises.reduce((acc, e) => acc + e.sets.length, 0);
  const completedSets = exercises.reduce(
    (acc, e) => acc + e.sets.filter((s) => s.isCompleted).length,
    0,
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        {title ? (
          <div className="flex items-baseline gap-2">
            <p className="text-sm font-semibold">{title}</p>
            {subtitle ? <p className="text-xs text-muted-foreground">{subtitle}</p> : null}
          </div>
        ) : (
          <span />
        )}
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Clock className="size-3.5" />
            <span className="tabular-nums">{formatDuration(view?.durationSeconds ?? null)}</span>
          </span>
          <span className="inline-flex items-center gap-1">
            <Target className="size-3.5" />
            <span className="tabular-nums">
              {completedSets}/{totalSets} series
            </span>
          </span>
        </div>
      </div>

      <Accordion type="multiple" className="flex flex-col">
        {exercises.map((exercise) => {
          const cardio = isCardio(exercise.muscleGroup);
          const exerciseCompleted = exercise.sets.filter((s) => s.isCompleted).length;
          return (
            <AccordionItem key={exercise.exerciseId} value={exercise.exerciseId}>
              <AccordionTrigger className="py-3">
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <p className="min-w-0 flex-1 truncate text-left text-sm font-medium">
                    {exercise.exerciseName}
                  </p>
                  <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                    {exerciseCompleted}/{exercise.sets.length}
                  </span>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="flex flex-col gap-2.5">
                  <div className="flex items-center gap-2">
                    {exercise.videoUrl ? (
                      <ExerciseVideoButton videoUrl={exercise.videoUrl} exerciseName={exercise.exerciseName} />
                    ) : null}
                    <Link
                      href={`/entrenador/clientes/${clientId}/ejercicio/${exercise.exerciseId}?name=${encodeURIComponent(exercise.exerciseName)}&muscle=${encodeURIComponent(exercise.muscleGroup)}`}
                      className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                    >
                      <History className="size-3.5" />
                      Ver historial
                    </Link>
                  </div>
                  <div className="grid grid-cols-[1.5rem_1fr_1fr_1.5rem] items-center gap-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    <span>#</span>
                    <span>{cardio ? "Minutos" : "Peso"}</span>
                    <span>{cardio ? "Nivel" : "Reps"}</span>
                    <span />
                  </div>
                  <div className="flex flex-col gap-2">
                    {exercise.sets.map((set, i) => (
                      <div key={i} className="grid grid-cols-[1.5rem_1fr_1fr_1.5rem] items-center gap-2 text-sm">
                        <span className="text-muted-foreground">{set.setNumber}</span>
                        <span className="tabular-nums">
                          {cardio
                            ? (set.actualMinutes ? `${set.actualMinutes} min` : "—")
                            : set.actualWeight
                              ? `${set.actualWeight} kg`
                              : "—"}
                        </span>
                        <span className="tabular-nums">
                          {cardio ? (set.actualLevel ?? "—") : (set.actualReps ?? "—")}
                        </span>
                        {set.isCompleted ? (
                          <Check className="size-4 text-primary" />
                        ) : (
                          <Minus className={cn("size-4 text-muted-foreground/40")} />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </div>
  );
}
