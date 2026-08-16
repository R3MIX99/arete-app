"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Check,
  ChevronDown,
  ChevronLeft,
  Clock,
  Flame,
  Footprints,
  History,
  Loader2,
  Route,
  Star,
  Target,
  Timer,
  X,
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { youtubeVideoId } from "@/lib/youtube";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { ExerciseHistoryList } from "@/components/client/exercise-history";
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

/** Una serie se da por hecha en cuanto tiene lo que le corresponde: en
 * fuerza, peso y reps (no hace falta tocar el check a mano, y si borras
 * uno se desmarca sola); en cardio, con minutos O nivel alcanza — a
 * veces la máquina no muestra uno de los dos, y no por eso la serie
 * debe quedar sin marcar. */
function hasRequiredValues(log: LogState[string], cardio: boolean): boolean {
  return cardio
    ? Boolean(log.actual_minutes || log.actual_level)
    : Boolean(log.actual_weight && log.actual_reps);
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
  const [historyExercise, setHistoryExercise] = useState<SessionExerciseInfo | null>(null);
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

  // exercise_id y set_number se guardan tal cual en cada registro (no
  // solo el enlace a la serie planeada) para que el historial y la
  // evolución del cliente sobrevivan intactos aunque el entrenador
  // después edite o borre esta rutina.
  const setMeta = useMemo(() => {
    const map = new Map<string, { exerciseId: string; setNumber: number }>();
    for (const exercise of exercises) {
      for (const set of exercise.sets) {
        map.set(set.id, { exerciseId: exercise.exercise_id, setNumber: set.set_number });
      }
    }
    return map;
  }, [exercises]);

  const saveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  // Recibe el log ya calculado (no lo relee de `logs` al disparar) — el
  // closure de este componente que capturó `scheduleSave` está fijo al
  // render donde se llamó, es decir ANTES de que el setLogs de ese mismo
  // tecleo se aplique. Si se dejaba que persistLog leyera `logs[setId]`
  // por su cuenta, el valor que se guardaba siempre era el de un paso
  // atrás: si el campo editado no volvía a tocarse (típicamente el
  // último campo que llenas, p. ej. el nivel de cardio), ese valor
  // nunca llegaba a guardarse y el registro quedaba incompleto.
  function scheduleSave(setId: string, nextLog: LogState[string]) {
    if (!sessionId) return;
    if (saveTimers.current[setId]) clearTimeout(saveTimers.current[setId]);
    saveTimers.current[setId] = setTimeout(() => persistLog(setId, nextLog), 600);
  }

  async function persistLog(setId: string, overrideLog?: LogState[string]) {
    if (!sessionId) return;
    const log = overrideLog ?? logs[setId] ?? emptyLog();
    const meta = setMeta.get(setId);
    if (!meta) return;
    await supabase.from("client_set_logs").upsert(
      {
        routine_exercise_set_id: setId,
        exercise_id: meta.exerciseId,
        set_number: meta.setNumber,
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

  function updateField(
    setId: string,
    field: keyof Omit<LogState[string], "is_completed">,
    value: string,
    cardio: boolean,
    restSeconds: number | null,
  ) {
    let justCompleted = false;
    let nextLog: LogState[string] = emptyLog();
    setLogs((prev) => {
      const current = prev[setId] ?? emptyLog();
      const wasCompleted = current.is_completed;
      const next = { ...current, [field]: value };
      next.is_completed = hasRequiredValues(next, cardio);
      justCompleted = next.is_completed && !wasCompleted;
      nextLog = next;
      return { ...prev, [setId]: next };
    });
    scheduleSave(setId, nextLog);
    // El descanso solo aplica a series de fuerza — el cardio no tiene
    // ese concepto entre valores de minutos/nivel, así que nunca debe
    // aparecer el cronómetro de descanso ahí.
    if (justCompleted && restSeconds && !cardio) setRestSecondsLeft(restSeconds);
  }

  function toggleComplete(setId: string, cardio: boolean, restSeconds: number | null) {
    let nextLog: LogState[string] = emptyLog();
    setLogs((prev) => {
      const current = prev[setId] ?? emptyLog();
      const next = { ...current, is_completed: !current.is_completed };
      nextLog = next;
      return { ...prev, [setId]: next };
    });
    if (saveTimers.current[setId]) clearTimeout(saveTimers.current[setId]);
    setTimeout(() => persistLog(setId, nextLog), 50);
    if (nextLog.is_completed && restSeconds && !cardio) setRestSecondsLeft(restSeconds);
  }

  // La rutina se trata como "de cardio" solo si TODOS sus ejercicios lo
  // son — así la pantalla de resumen pide lo que corresponde (calorías/
  // distancia/pasos, o estrellas de fuerza) sin necesitar un campo
  // aparte al crear la rutina.
  const cardioRoutine = exercises.length > 0 && exercises.every((e) => isCardio(e.muscle_group));

  const [stage, setStage] = useState<"active" | "summary">("active");
  const [frozenDuration, setFrozenDuration] = useState<number | null>(null);
  const [difficulty, setDifficulty] = useState<number | null>(null);
  const [ratingStars, setRatingStars] = useState<number | null>(null);
  const [calories, setCalories] = useState("");
  const [distance, setDistance] = useState("");
  const [steps, setSteps] = useState("");
  const [comment, setComment] = useState("");

  async function handleFinish() {
    if (!sessionId) return;
    setFinishing(true);
    // Date.now() aquí es parte de un manejador de clic (async), no del
    // render; se usa solo para calcular la duración de la sesión.
    // eslint-disable-next-line react-hooks/purity
    const finishedAt = Date.now();

    // Cualquier serie con datos capturados que no se marcó a mano con el
    // check se da por completada al terminar la sesión — si no, sus
    // valores quedan guardados pero nunca cuentan para el historial de
    // Evolución (que solo mira series con is_completed = true).
    const toAutoComplete: { setId: string; log: LogState[string] }[] = [];
    for (const exercise of exercises) {
      for (const set of exercise.sets) {
        const log = logs[set.id];
        if (!log || log.is_completed) continue;
        const hasValue = log.actual_reps || log.actual_weight || log.actual_minutes || log.actual_level;
        if (hasValue) toAutoComplete.push({ setId: set.id, log: { ...log, is_completed: true } });
      }
    }
    if (toAutoComplete.length > 0) {
      setLogs((prev) => {
        const next = { ...prev };
        for (const u of toAutoComplete) next[u.setId] = u.log;
        return next;
      });
      await Promise.all(
        toAutoComplete.map((u) => {
          if (saveTimers.current[u.setId]) clearTimeout(saveTimers.current[u.setId]);
          return persistLog(u.setId, u.log);
        }),
      );
    }

    // El cronómetro se congela aquí — la sesión todavía no se marca
    // "completed" en la base, eso pasa hasta que el cliente confirme la
    // reseña en la pantalla de resumen (o si la abandona, la sesión
    // sigue "in_progress" y puede retomarla).
    setFrozenDuration(Math.round((finishedAt - startedAtRef.current) / 1000));
    setFinishing(false);
    setStage("summary");
  }

  async function handleSaveSummary() {
    if (!sessionId) return;
    setFinishing(true);
    const { error } = await supabase
      .from("client_sessions")
      .update({
        status: "completed",
        finished_at: new Date().toISOString(),
        duration_seconds: frozenDuration,
        difficulty_level: difficulty,
        rating_stars: cardioRoutine ? null : ratingStars,
        calories_burned: cardioRoutine && calories ? Number(calories) : null,
        distance_km: cardioRoutine && distance ? Number(distance) : null,
        steps_count: cardioRoutine && steps ? Number(steps) : null,
        client_comment: comment.trim() || null,
      })
      .eq("id", sessionId);
    setFinishing(false);
    if (error) {
      toast.error("No se pudo finalizar la sesión");
      return;
    }
    toast.success("¡Sesión completada!");
    router.push(`/cliente/entrenamiento/sesion/${sessionId}`);
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
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(initialSessionId ? `/cliente/entrenamiento/sesion/${initialSessionId}` : "/cliente")}
            >
              Ver resumen
            </Button>
          </>
        )}
      </div>
    );
  }

  if (stage === "summary") {
    return (
      <div className="mx-auto flex max-w-md flex-col gap-4 pb-28">
        <div className="sticky top-0 z-10 flex items-center gap-3 border-b bg-background/95 px-4 py-3 backdrop-blur-sm">
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold">{routineName}</p>
            <p className="text-xs text-muted-foreground">¿Cómo te fue en esta sesión?</p>
          </div>
        </div>

        <div className="px-4">
          <div className="glass-card grid grid-cols-2 divide-x rounded-xl">
            <div className="flex flex-col items-center gap-1 px-4 py-3">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Clock className="size-3.5" />
                <span className="text-[11px] font-medium uppercase tracking-wide">Duración</span>
              </div>
              <p className="text-lg font-semibold tabular-nums">
                {frozenDuration ? `${Math.round(frozenDuration / 60)} min` : "—"}
              </p>
            </div>
            <div className="flex flex-col items-center gap-1 px-4 py-3">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Target className="size-3.5" />
                <span className="text-[11px] font-medium uppercase tracking-wide">Series</span>
              </div>
              <p className="text-lg font-semibold tabular-nums">
                {completedSets}/{totalSets}
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4 px-4">
          <div>
            <p className="mb-1 text-sm font-medium">¿Qué tan difícil te pareció?</p>
            <p className="text-center text-3xl font-bold tabular-nums text-primary">{difficulty ?? 5}</p>
            <Slider
              min={1}
              max={10}
              step={1}
              value={[difficulty ?? 5]}
              onValueChange={([v]) => setDifficulty(v)}
              className="my-3"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Fácil</span>
              <span>Difícil</span>
            </div>
          </div>

          {cardioRoutine ? (
            <div className="flex flex-col gap-3">
              <p className="text-sm font-medium">Datos de la máquina (opcional)</p>
              <div className="grid grid-cols-3 gap-2">
                <label className="flex flex-col gap-1">
                  <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                    <Flame className="size-3.5" /> Kcal
                  </span>
                  <Input inputMode="decimal" value={calories} onChange={(e) => setCalories(e.target.value)} className="h-9" />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                    <Route className="size-3.5" /> Km
                  </span>
                  <Input inputMode="decimal" value={distance} onChange={(e) => setDistance(e.target.value)} className="h-9" />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                    <Footprints className="size-3.5" /> Pasos
                  </span>
                  <Input inputMode="numeric" value={steps} onChange={(e) => setSteps(e.target.value)} className="h-9" />
                </label>
              </div>
            </div>
          ) : (
            <div>
              <p className="mb-2 text-sm font-medium">¿Qué tal te pareció la rutina?</p>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setRatingStars((r) => (r === n ? null : n))}
                    aria-label={`${n} estrellas`}
                    className="p-0.5"
                  >
                    <Star
                      className={cn(
                        "size-7 transition-colors",
                        ratingStars !== null && n <= ratingStars
                          ? "fill-amber-400 text-amber-400"
                          : "text-muted-foreground/30",
                      )}
                    />
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <p className="mb-2 text-sm font-medium">Mensaje para tu entrenador (opcional)</p>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Ej. Esta rutina estuvo muy bien, aunque el nivel 8 se me hizo pesado…"
              rows={4}
            />
          </div>
        </div>

        <div className="fixed inset-x-0 bottom-0 z-20 border-t bg-background/95 p-4 backdrop-blur-sm">
          <Button className="mx-auto w-full max-w-md" size="lg" disabled={finishing} onClick={handleSaveSummary}>
            {finishing ? <Loader2 className="size-4 animate-spin" /> : null}
            Finalizar rutina
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-md flex-col gap-3 pb-28">
      <div className="sticky top-0 z-10 flex items-center gap-3 border-b bg-background/95 px-4 py-3 backdrop-blur-sm">
        <Button variant="ghost" size="icon" className="shrink-0" onClick={() => router.push("/cliente")} aria-label="Ir a inicio">
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
          const videoId = exercise.video_url ? youtubeVideoId(exercise.video_url) : null;

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
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setHistoryExercise(exercise);
                  }}
                  className="shrink-0 text-muted-foreground hover:text-foreground"
                  aria-label="Ver historial del ejercicio"
                >
                  <History className="size-4.5" />
                </button>
                <ChevronDown className={cn("size-4 shrink-0 text-muted-foreground transition-transform", isOpen && "rotate-180")} />
              </button>

              {isOpen ? (
                <div className="border-t px-4 py-3">
                  {videoId ? (
                    <div className="mx-auto mb-3 aspect-video w-full max-w-56 overflow-hidden rounded-lg border border-border">
                      <iframe
                        className="size-full"
                        src={`https://www.youtube.com/embed/${videoId}`}
                        title={exercise.exercise_name}
                        allowFullScreen
                      />
                    </div>
                  ) : null}
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
                                onChange={(e) =>
                                  updateField(set.id, "actual_minutes", e.target.value, true, set.rest_seconds)
                                }
                                className="h-9"
                              />
                              <Input
                                inputMode="numeric"
                                placeholder={set.target_level?.toString() ?? "-"}
                                value={log.actual_level}
                                onChange={(e) =>
                                  updateField(set.id, "actual_level", e.target.value, true, set.rest_seconds)
                                }
                                className="h-9"
                              />
                            </>
                          ) : (
                            <>
                              <Input
                                inputMode="decimal"
                                placeholder={set.suggested_weight?.toString() ?? "kg"}
                                value={log.actual_weight}
                                onChange={(e) =>
                                  updateField(set.id, "actual_weight", e.target.value, false, set.rest_seconds)
                                }
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
                                onChange={(e) =>
                                  updateField(set.id, "actual_reps", e.target.value, false, set.rest_seconds)
                                }
                                className="h-9"
                              />
                            </>
                          )}
                          <button
                            type="button"
                            onClick={() => toggleComplete(set.id, cardio, set.rest_seconds)}
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

      <div className="fixed inset-x-0 bottom-0 z-20 border-t bg-background/95 p-4 backdrop-blur-sm">
        <Button className="mx-auto w-full max-w-md" size="lg" disabled={finishing} onClick={handleFinish}>
          {finishing ? <Loader2 className="size-4 animate-spin" /> : null}
          Terminar sesión
        </Button>
      </div>

      {restSecondsLeft !== null ? (
        <div className="fixed inset-x-0 bottom-24 z-30 flex justify-center px-4">
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

      <ResponsiveDialog
        open={historyExercise !== null}
        onOpenChange={(open) => !open && setHistoryExercise(null)}
        title={historyExercise ? `Historial — ${historyExercise.exercise_name}` : ""}
      >
        {historyExercise ? (
          <ExerciseHistoryList exercise={historyExercise} cardio={isCardio(historyExercise.muscle_group)} />
        ) : null}
      </ResponsiveDialog>
    </div>
  );
}
