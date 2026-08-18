"use client";

import { useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Check,
  ChevronDown,
  ChevronLeft,
  Clock,
  Dumbbell,
  Flame,
  Footprints,
  History,
  Loader2,
  PlayCircle,
  Route,
  Star,
  Target,
  Timer,
  X,
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { youtubeThumbnails, youtubeVideoId } from "@/lib/youtube";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { ExerciseHistoryList } from "@/components/client/exercise-history";
import { ThumbnailImage } from "@/components/client/thumbnail-image";
import type { SessionExerciseInfo, SessionSetLog } from "@/lib/types/client-panel";

type LogState = Record<
  string,
  { actual_reps: string; actual_weight: string; actual_minutes: string; actual_level: string; is_completed: boolean }
>;

function isCardio(muscleGroup: string) {
  return muscleGroup === "cardio";
}

/** Alterna un id dentro de un Set en state (los `expanded`/`videoOpen`
 * de abajo) — misma lógica de toggle, reutilizada para los dos. */
function toggleSet(setter: Dispatch<SetStateAction<Set<string>>>, id: string) {
  setter((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  });
}

function emptyLog(): LogState[string] {
  return { actual_reps: "", actual_weight: "", actual_minutes: "", actual_level: "", is_completed: false };
}

/** Resumen del objetivo del ejercicio ("3 series x 10-12 reps") a partir
 * de su primera serie — se muestra siempre, incluso con la pestaña
 * cerrada, para que el cliente sepa qué le toca sin tener que abrirla. */
function exerciseTargetSummary(exercise: SessionExerciseInfo): string {
  const setCount = exercise.sets.length;
  const label = `${setCount} serie${setCount === 1 ? "" : "s"}`;
  const first = exercise.sets[0];
  if (!first) return label;
  if (first.target_minutes !== null) return `${label} x ${first.target_minutes} min`;
  const min = first.target_reps_min;
  const max = first.target_reps_max;
  if (min === null && max === null) return label;
  const reps = min !== null && max !== null && min !== max ? `${min}-${max}` : `${min ?? max}`;
  return `${label} x ${reps} reps`;
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
  // Clic en el cuadro del video: se abre en grande en un popup, ya no se
  // reproduce ahí mismo en el cuadrito chico (se veía muy pequeño).
  const [videoModalExercise, setVideoModalExercise] = useState<SessionExerciseInfo | null>(null);
  // Clic en el nombre del ejercicio: manda a una "página" propia del
  // ejercicio (en teléfono el Drawer sale de abajo a pantalla completa) —
  // video grande arriba, nombre, e historial, sin la tabla de series.
  const [detailExercise, setDetailExercise] = useState<SessionExerciseInfo | null>(null);
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

  // Recibe el log ya calculado por el llamador — no lo relee de `logs`
  // al disparar, porque ese state solo se actualiza hasta el siguiente
  // render (la función que se le pasa a setLogs corre durante ese
  // render, no en el momento en que se llama a setLogs), así que
  // cualquier variable que dependiera de ese callback para "avisar" el
  // valor nuevo podía seguir vacía cuando se programaba el guardado.
  // Por eso aquí el valor a guardar se calcula ANTES de llamar a
  // setLogs, a partir del `logs` del render actual — no dentro de él.
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
    // `next` se calcula aquí, a partir del `logs` de este render — NO
    // dentro del callback de setLogs, porque ese callback corre en el
    // siguiente render (no de inmediato), así que cualquier variable
    // que dependiera de él para "avisar" el valor nuevo seguía vacía
    // en este punto del código.
    const current = logs[setId] ?? emptyLog();
    const wasCompleted = current.is_completed;
    const next = { ...current, [field]: value };
    next.is_completed = hasRequiredValues(next, cardio);
    const justCompleted = next.is_completed && !wasCompleted;

    setLogs((prev) => ({ ...prev, [setId]: next }));
    scheduleSave(setId, next);
    // El descanso solo aplica a series de fuerza — el cardio no tiene
    // ese concepto entre valores de minutos/nivel, así que nunca debe
    // aparecer el cronómetro de descanso ahí.
    if (justCompleted && restSeconds && !cardio) setRestSecondsLeft(restSeconds);
  }

  function toggleComplete(setId: string, cardio: boolean, restSeconds: number | null) {
    const current = logs[setId] ?? emptyLog();
    const next = { ...current, is_completed: !current.is_completed };

    setLogs((prev) => ({ ...prev, [setId]: next }));
    if (saveTimers.current[setId]) clearTimeout(saveTimers.current[setId]);
    setTimeout(() => persistLog(setId, next), 50);
    if (next.is_completed && restSeconds && !cardio) setRestSecondsLeft(restSeconds);
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

      <div className="flex flex-col divide-y px-4">
        {exercises.map((exercise) => {
          const isOpen = expanded.has(exercise.id);
          const cardio = isCardio(exercise.muscle_group);
          const exerciseComplete =
            exercise.sets.length > 0 && exercise.sets.every((s) => logs[s.id]?.is_completed);
          const videoId = exercise.video_url ? youtubeVideoId(exercise.video_url) : null;
          const thumbs = youtubeThumbnails(exercise.video_url);

          return (
            <div key={exercise.id} className="py-4">
              {/* El cuadro del video es cuadrado (mismo alto que ancho) y
                  más chico en ancho que antes, pero más alto — se pidió
                  explícitamente "cuadrado literal" y con más altura. Un
                  clic abre el video en grande en un popup (más abajo); ya
                  no se reproduce dentro del cuadro. */}
              <div className="flex items-start gap-3">
                <button
                  type="button"
                  onClick={() => videoId && setVideoModalExercise(exercise)}
                  disabled={!videoId}
                  className="relative aspect-square w-36 shrink-0 overflow-hidden rounded-lg bg-muted"
                  aria-label={videoId ? "Ver video del ejercicio" : undefined}
                >
                  {thumbs ? (
                    <ThumbnailImage
                      src={thumbs.primary}
                      fallbackSrc={thumbs.fallback}
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                  ) : exercise.image_url ? (
                    <ThumbnailImage
                      src={exercise.image_url}
                      fallbackSrc={exercise.image_fallback_url}
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                      <Dumbbell className="size-6" />
                    </div>
                  )}
                  {videoId ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                      <PlayCircle className="size-10 text-white drop-shadow" />
                    </div>
                  ) : null}
                  {exerciseComplete ? (
                    <div className="absolute right-1.5 top-1.5 flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                      <Check className="size-3" />
                    </div>
                  ) : null}
                </button>

                {/* Nombre e historial más grandes — el nombre es lo que se
                    hace clic para entrar al detalle, así que necesita verse
                    como algo clicable. El objetivo (series x reps) se baja
                    debajo del video, más grande, antes del botón de ver
                    series. */}
                <div className="flex min-w-0 flex-1 flex-col gap-2 py-0.5">
                  <button type="button" onClick={() => setDetailExercise(exercise)} className="text-left">
                    <p className="text-base leading-snug font-semibold">{exercise.exercise_name}</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setHistoryExercise(exercise)}
                    className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
                  >
                    <History className="size-4" />
                    Historial
                  </button>
                </div>
              </div>

              <p className="mt-3 text-base font-medium text-primary">{exerciseTargetSummary(exercise)}</p>

              {/* Botón de ver/ocultar series: más grande y separado de la
                  fila de arriba — al abrirlo solo aparecen la nota del
                  entrenador y la tabla de series, nada de video. */}
              <button
                type="button"
                onClick={() => toggleSet(setExpanded, exercise.id)}
                className="mt-3 flex items-center gap-1.5 rounded-full bg-muted px-3.5 py-2 text-sm font-medium text-primary"
              >
                {isOpen ? "Ocultar series" : "Ver series"}
                <ChevronDown className={cn("size-4 transition-transform", isOpen && "rotate-180")} />
              </button>

              {isOpen ? (
                <div className="pt-3">
                  {exercise.notes ? (
                    <p className="mb-3 text-xs text-muted-foreground">{exercise.notes}</p>
                  ) : null}
                  <div
                    className="grid items-center gap-3 pb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground"
                    style={{ gridTemplateColumns: "1.5rem 1fr 1fr 2.25rem" }}
                  >
                    <span>#</span>
                    <span>{cardio ? "Minutos" : "Peso"}</span>
                    <span>{cardio ? "Nivel" : "Reps"}</span>
                    <span />
                  </div>
                  <div className="flex flex-col gap-3">
                    {exercise.sets.map((set) => {
                      const log = logs[set.id] ?? emptyLog();
                      return (
                        <div
                          key={set.id}
                          className="grid items-center gap-3"
                          style={{ gridTemplateColumns: "1.5rem 1fr 1fr 2.25rem" }}
                        >
                          <span className="text-sm text-muted-foreground">{set.set_number}</span>
                          {cardio ? (
                            <>
                              <input
                                inputMode="decimal"
                                placeholder={set.target_minutes?.toString() ?? "-"}
                                value={log.actual_minutes}
                                onChange={(e) =>
                                  updateField(set.id, "actual_minutes", e.target.value, true, set.rest_seconds)
                                }
                                className="w-full border-0 border-b border-input bg-transparent px-0 py-1.5 text-sm outline-none placeholder:text-muted-foreground/60 focus:border-primary"
                              />
                              <input
                                inputMode="numeric"
                                placeholder={set.target_level?.toString() ?? "-"}
                                value={log.actual_level}
                                onChange={(e) =>
                                  updateField(set.id, "actual_level", e.target.value, true, set.rest_seconds)
                                }
                                className="w-full border-0 border-b border-input bg-transparent px-0 py-1.5 text-sm outline-none placeholder:text-muted-foreground/60 focus:border-primary"
                              />
                            </>
                          ) : (
                            <>
                              <input
                                inputMode="decimal"
                                placeholder={set.suggested_weight?.toString() ?? "kg"}
                                value={log.actual_weight}
                                onChange={(e) =>
                                  updateField(set.id, "actual_weight", e.target.value, false, set.rest_seconds)
                                }
                                className="w-full border-0 border-b border-input bg-transparent px-0 py-1.5 text-sm outline-none placeholder:text-muted-foreground/60 focus:border-primary"
                              />
                              <input
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
                                className="w-full border-0 border-b border-input bg-transparent px-0 py-1.5 text-sm outline-none placeholder:text-muted-foreground/60 focus:border-primary"
                              />
                            </>
                          )}
                          <button
                            type="button"
                            onClick={() => toggleComplete(set.id, cardio, set.rest_seconds)}
                            className={cn(
                              "flex size-8 shrink-0 items-center justify-center rounded-full transition-colors",
                              log.is_completed
                                ? "bg-primary text-primary-foreground"
                                : "text-muted-foreground/50 hover:bg-accent hover:text-foreground",
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

      {/* Popup del video: se abre al hacer clic en el cuadro de la lista,
          ya en grande — ahí sí se reproduce. */}
      <ResponsiveDialog
        open={videoModalExercise !== null}
        onOpenChange={(open) => !open && setVideoModalExercise(null)}
        title={videoModalExercise?.exercise_name ?? ""}
        contentClassName="sm:max-w-lg"
      >
        {videoModalExercise?.video_url && youtubeVideoId(videoModalExercise.video_url) ? (
          <div className="aspect-video w-full overflow-hidden rounded-lg">
            <iframe
              className="size-full"
              src={`https://www.youtube.com/embed/${youtubeVideoId(videoModalExercise.video_url)}?autoplay=1`}
              title={videoModalExercise.exercise_name}
              allowFullScreen
            />
          </div>
        ) : null}
      </ResponsiveDialog>

      {/* "Página" del ejercicio: al hacer clic en su nombre. En teléfono
          es el Drawer saliendo a pantalla completa — video grande arriba,
          nombre, objetivo, nota del entrenador, y el historial — sin la
          tabla de series, que se queda en la lista. */}
      <ResponsiveDialog
        open={detailExercise !== null}
        onOpenChange={(open) => !open && setDetailExercise(null)}
        title={detailExercise?.exercise_name ?? ""}
        contentClassName="sm:max-w-lg"
      >
        {detailExercise ? (
          <div className="flex flex-col gap-4">
            <div className="aspect-video w-full overflow-hidden rounded-lg bg-muted">
              {(() => {
                const videoId = detailExercise.video_url ? youtubeVideoId(detailExercise.video_url) : null;
                if (videoId) {
                  return (
                    <iframe
                      className="size-full"
                      src={`https://www.youtube.com/embed/${videoId}`}
                      title={detailExercise.exercise_name}
                      allowFullScreen
                    />
                  );
                }
                const thumbs = youtubeThumbnails(detailExercise.video_url);
                if (thumbs) {
                  return (
                    <ThumbnailImage
                      src={thumbs.primary}
                      fallbackSrc={thumbs.fallback}
                      className="size-full object-cover"
                    />
                  );
                }
                if (detailExercise.image_url) {
                  return (
                    <ThumbnailImage
                      src={detailExercise.image_url}
                      fallbackSrc={detailExercise.image_fallback_url}
                      className="size-full object-cover"
                    />
                  );
                }
                return (
                  <div className="flex size-full items-center justify-center text-muted-foreground">
                    <Dumbbell className="size-8" />
                  </div>
                );
              })()}
            </div>

            <p className="text-sm font-medium text-primary">{exerciseTargetSummary(detailExercise)}</p>

            {detailExercise.notes ? (
              <p className="text-sm text-muted-foreground">{detailExercise.notes}</p>
            ) : null}

            <Button
              variant="outline"
              className="w-fit"
              onClick={() => {
                setDetailExercise(null);
                setHistoryExercise(detailExercise);
              }}
            >
              <History className="size-4" />
              Ver historial
            </Button>
          </div>
        ) : null}
      </ResponsiveDialog>
    </div>
  );
}
