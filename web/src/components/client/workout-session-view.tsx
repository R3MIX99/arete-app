"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, ChevronDown, ChevronLeft, Loader2, PlayCircle, Timer, X } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { SessionExerciseInfo, SessionSetLog } from "@/lib/types/client-panel";

type LogState = Record<
  string,
  { actual_reps: string; actual_weight: string; actual_minutes: string; actual_level: string; is_completed: boolean }
>;

function isCardio(muscleGroup: string) {
  return muscleGroup === "cardio";
}

function emptyLog(): LogState[string] {
  return { actual_reps: "", actual_weight: "", actual_minutes: "", actual_level: "", is_completed: false };
}

export function WorkoutSessionView({
  clientId,
  assignmentId,
  routineId,
  sessionDate,
  routineName,
  exercises,
  initialSessionId,
  initialSessionStatus,
  initialLogs,
}: {
  clientId: string;
  assignmentId: string;
  routineId: string;
  sessionDate: string;
  routineName: string;
  exercises: SessionExerciseInfo[];
  initialSessionId: string | null;
  initialSessionStatus: string | null;
  initialLogs: SessionSetLog[];
}) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [sessionId, setSessionId] = useState<string | null>(initialSessionId);
  const [ensuring, setEnsuring] = useState(!initialSessionId);
  const [finishing, setFinishing] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set(exercises[0] ? [exercises[0].id] : []));
  const [restSecondsLeft, setRestSecondsLeft] = useState<number | null>(null);
  const [startedAt] = useState<number>(() => Date.now());
  const startedAtRef = useRef<number>(startedAt);

  const [logs, setLogs] = useState<LogState>(() => {
    const state: LogState = {};
    for (const log of initialLogs) {
      state[log.routine_exercise_set_id] = {
        actual_reps: log.actual_reps?.toString() ?? "",
        actual_weight: log.actual_weight?.toString() ?? "",
        actual_minutes: log.actual_minutes?.toString() ?? "",
        actual_level: log.actual_level?.toString() ?? "",
        is_completed: log.is_completed,
      };
    }
    return state;
  });

  // Crea la sesión si aún no existe (primera vez que el cliente abre esta rutina hoy).
  useEffect(() => {
    if (sessionId) return;
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("client_sessions")
        .insert({
          client_id: clientId,
          assignment_id: assignmentId,
          routine_id: routineId,
          session_date: sessionDate,
          status: "in_progress",
        })
        .select("id")
        .single();
      if (cancelled) return;
      if (error) {
        toast.error("No se pudo iniciar la sesión");
        setEnsuring(false);
        return;
      }
      startedAtRef.current = Date.now();
      setSessionId(data.id);
      setEnsuring(false);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Timer de descanso no intrusivo.
  useEffect(() => {
    if (restSecondsLeft === null || restSecondsLeft <= 0) return;
    const t = setTimeout(
      () => setRestSecondsLeft((s) => (s !== null && s > 1 ? s - 1 : null)),
      1000,
    );
    return () => clearTimeout(t);
  }, [restSecondsLeft]);

  const saveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  function scheduleSave(setId: string) {
    if (!sessionId) return;
    if (saveTimers.current[setId]) clearTimeout(saveTimers.current[setId]);
    saveTimers.current[setId] = setTimeout(() => persistLog(setId), 600);
  }

  async function persistLog(setId: string) {
    if (!sessionId) return;
    const log = logs[setId] ?? emptyLog();
    await supabase.from("client_set_logs").upsert(
      {
        routine_exercise_set_id: setId,
        client_id: clientId,
        session_id: sessionId,
        session_date: sessionDate,
        actual_reps: log.actual_reps ? Number(log.actual_reps) : null,
        actual_weight: log.actual_weight ? Number(log.actual_weight) : null,
        actual_minutes: log.actual_minutes ? Number(log.actual_minutes) : null,
        actual_level: log.actual_level ? Number(log.actual_level) : null,
        is_completed: log.is_completed,
      },
      { onConflict: "session_id,routine_exercise_set_id" },
    );
  }

  function updateField(setId: string, field: keyof Omit<LogState[string], "is_completed">, value: string) {
    setLogs((prev) => ({ ...prev, [setId]: { ...(prev[setId] ?? emptyLog()), [field]: value } }));
    scheduleSave(setId);
  }

  function toggleComplete(setId: string, restSeconds: number | null) {
    setLogs((prev) => {
      const current = prev[setId] ?? emptyLog();
      const next = { ...current, is_completed: !current.is_completed };
      return { ...prev, [setId]: next };
    });
    if (saveTimers.current[setId]) clearTimeout(saveTimers.current[setId]);
    setTimeout(() => persistLog(setId), 50);
    const willComplete = !(logs[setId]?.is_completed ?? false);
    if (willComplete && restSeconds) setRestSecondsLeft(restSeconds);
  }

  async function handleFinish() {
    if (!sessionId) return;
    setFinishing(true);
    const durationSeconds = Math.round((Date.now() - startedAtRef.current) / 1000);
    const { error } = await supabase
      .from("client_sessions")
      .update({ status: "completed", finished_at: new Date().toISOString(), duration_seconds: durationSeconds })
      .eq("id", sessionId);
    setFinishing(false);
    if (error) {
      toast.error("No se pudo finalizar la sesión");
      return;
    }
    toast.success("¡Sesión completada!");
    router.push("/cliente");
  }

  const totalSets = exercises.reduce((acc, e) => acc + e.sets.length, 0);
  const completedSets = exercises.reduce(
    (acc, e) => acc + e.sets.filter((s) => logs[s.id]?.is_completed).length,
    0,
  );

  if (ensuring || initialSessionStatus === "completed") {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-3 p-10 text-center">
        {ensuring ? (
          <>
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Preparando tu sesión…</p>
          </>
        ) : (
          <>
            <Check className="size-8 text-primary" />
            <p className="font-medium">Ya completaste esta sesión</p>
            <Button variant="outline" size="sm" onClick={() => router.push("/cliente")}>
              Volver al inicio
            </Button>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-md flex-col gap-3 pb-24">
      <div className="sticky top-0 z-10 flex items-center gap-3 border-b bg-background/95 px-4 py-3 backdrop-blur-sm">
        <Button variant="ghost" size="icon" className="shrink-0" onClick={() => router.push("/cliente")}>
          <ChevronLeft className="size-5" />
        </Button>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{routineName}</p>
          <p className="text-xs text-muted-foreground">
            {completedSets}/{totalSets} series completadas
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-3 px-4">
        {exercises.map((exercise) => {
          const isOpen = expanded.has(exercise.id);
          const cardio = isCardio(exercise.muscle_group);
          const exerciseComplete =
            exercise.sets.length > 0 && exercise.sets.every((s) => logs[s.id]?.is_completed);

          return (
            <div key={exercise.id} className="glass-card overflow-hidden rounded-xl">
              <button
                type="button"
                className="flex w-full items-center gap-3 px-4 py-3 text-left"
                onClick={() =>
                  setExpanded((prev) => {
                    const next = new Set(prev);
                    if (next.has(exercise.id)) next.delete(exercise.id);
                    else next.add(exercise.id);
                    return next;
                  })
                }
              >
                <div
                  className={cn(
                    "flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                    exerciseComplete ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                  )}
                >
                  {exerciseComplete ? <Check className="size-4" /> : exercise.sets.length}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{exercise.exercise_name}</p>
                  {exercise.notes ? (
                    <p className="truncate text-xs text-muted-foreground">{exercise.notes}</p>
                  ) : null}
                </div>
                {exercise.video_url ? (
                  <a
                    href={exercise.video_url}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="shrink-0 text-muted-foreground hover:text-foreground"
                    aria-label="Ver video"
                  >
                    <PlayCircle className="size-4.5" />
                  </a>
                ) : null}
                <ChevronDown className={cn("size-4 shrink-0 text-muted-foreground transition-transform", isOpen && "rotate-180")} />
              </button>

              {isOpen ? (
                <div className="border-t px-4 py-3">
                  <div
                    className={cn(
                      "grid items-center gap-2 pb-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground",
                      cardio ? "grid-cols-[1.5rem_1fr_1fr_2.25rem]" : "grid-cols-[1.5rem_1fr_1fr_2.25rem]",
                    )}
                  >
                    <span>#</span>
                    <span>{cardio ? "Minutos" : "Peso"}</span>
                    <span>{cardio ? "Nivel" : "Reps"}</span>
                    <span />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    {exercise.sets.map((set) => {
                      const log = logs[set.id] ?? emptyLog();
                      return (
                        <div
                          key={set.id}
                          className="grid grid-cols-[1.5rem_1fr_1fr_2.25rem] items-center gap-2"
                        >
                          <span className="text-sm text-muted-foreground">{set.set_number}</span>
                          {cardio ? (
                            <>
                              <Input
                                inputMode="decimal"
                                placeholder={set.target_minutes?.toString() ?? "-"}
                                value={log.actual_minutes}
                                onChange={(e) => updateField(set.id, "actual_minutes", e.target.value)}
                                className="h-9"
                              />
                              <Input
                                inputMode="numeric"
                                placeholder={set.target_level?.toString() ?? "-"}
                                value={log.actual_level}
                                onChange={(e) => updateField(set.id, "actual_level", e.target.value)}
                                className="h-9"
                              />
                            </>
                          ) : (
                            <>
                              <Input
                                inputMode="decimal"
                                placeholder={set.suggested_weight?.toString() ?? "kg"}
                                value={log.actual_weight}
                                onChange={(e) => updateField(set.id, "actual_weight", e.target.value)}
                                className="h-9"
                              />
                              <Input
                                inputMode="numeric"
                                placeholder={
                                  set.target_reps_min && set.target_reps_max
                                    ? `${set.target_reps_min}-${set.target_reps_max}`
                                    : "reps"
                                }
                                value={log.actual_reps}
                                onChange={(e) => updateField(set.id, "actual_reps", e.target.value)}
                                className="h-9"
                              />
                            </>
                          )}
                          <button
                            type="button"
                            onClick={() => toggleComplete(set.id, set.rest_seconds)}
                            className={cn(
                              "flex size-9 shrink-0 items-center justify-center rounded-lg border transition-colors",
                              log.is_completed
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-input text-muted-foreground hover:bg-accent",
                            )}
                            aria-label="Marcar serie completada"
                          >
                            <Check className="size-4" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      <div className="px-4">
        <Button className="w-full" size="lg" disabled={finishing} onClick={handleFinish}>
          {finishing ? <Loader2 className="size-4 animate-spin" /> : null}
          Terminar sesión
        </Button>
      </div>

      {restSecondsLeft !== null ? (
        <div className="fixed inset-x-0 bottom-20 z-30 flex justify-center px-4">
          <div className="flex items-center gap-3 rounded-full border bg-card/95 px-4 py-2 shadow-lg backdrop-blur-sm">
            <Timer className="size-4 text-primary" />
            <span className="text-sm font-medium tabular-nums">
              Descanso: {Math.floor(restSecondsLeft / 60)}:{String(restSecondsLeft % 60).padStart(2, "0")}
            </span>
            <button
              type="button"
              onClick={() => setRestSecondsLeft(null)}
              className="text-muted-foreground hover:text-foreground"
              aria-label="Saltar descanso"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
