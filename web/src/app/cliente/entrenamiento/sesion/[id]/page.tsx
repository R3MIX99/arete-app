import { redirect } from "next/navigation";
import Link from "next/link";
import { Check, ChevronLeft, Clock, History, Minus, Target } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { fetchRoutineSessionData } from "@/lib/server/client-routine-data";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ExerciseVideoButton } from "@/components/client/exercise-video-button";
import type { SessionSetLog } from "@/lib/types/client-panel";

function isCardio(muscleGroup: string) {
  return muscleGroup === "cardio";
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return "";
  const m = Math.round(seconds / 60);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem > 0 ? `${h} h ${rem} min` : `${h} h`;
}

export default async function SessionReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: session } = await supabase
    .from("client_sessions")
    .select("id, routine_id, session_date, duration_seconds, status")
    .eq("id", id)
    .eq("client_id", user.id)
    .maybeSingle();

  if (!session) redirect("/cliente/entrenamiento");

  const [routineData, { data: logRows }] = await Promise.all([
    fetchRoutineSessionData(supabase, session.routine_id),
    supabase
      .from("client_set_logs")
      .select("routine_exercise_set_id, actual_reps, actual_weight, actual_minutes, actual_level, is_completed")
      .eq("session_id", id),
  ]);

  if (!routineData) redirect("/cliente/entrenamiento");
  const { routineName, exercises } = routineData;

  const logBySetId = new Map(
    ((logRows ?? []) as SessionSetLog[]).map((l) => [l.routine_exercise_set_id, l]),
  );

  const totalSets = exercises.reduce((acc, e) => acc + e.sets.length, 0);
  const completedSets = exercises.reduce(
    (acc, e) => acc + e.sets.filter((s) => logBySetId.get(s.id)?.is_completed).length,
    0,
  );

  return (
    <div className="mx-auto flex max-w-md flex-col gap-3 pb-24">
      <div className="sticky top-0 z-10 flex items-center gap-3 border-b bg-background/95 px-4 py-3 backdrop-blur-sm">
        <Link
          href="/cliente/entrenamiento"
          className="flex size-9 shrink-0 items-center justify-center rounded-md text-foreground hover:bg-accent"
        >
          <ChevronLeft className="size-5" />
        </Link>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{routineName}</p>
          <p className="text-xs text-muted-foreground">{formatDate(session.session_date)}</p>
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
              {session.duration_seconds ? formatDuration(session.duration_seconds) : "—"}
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

      <div className="flex flex-col gap-3 px-4">
        {exercises.map((exercise) => {
          const cardio = isCardio(exercise.muscle_group);
          return (
            <div key={exercise.id} className="glass-card overflow-hidden rounded-xl">
              <div className="flex items-center gap-3 px-4 py-3">
                <p className="min-w-0 flex-1 truncate text-sm font-medium">{exercise.exercise_name}</p>
                {exercise.video_url ? (
                  <ExerciseVideoButton videoUrl={exercise.video_url} exerciseName={exercise.exercise_name} />
                ) : null}
                <Link
                  href={`/cliente/entrenamiento/ejercicio-historial/${exercise.id}`}
                  className="shrink-0 text-muted-foreground hover:text-foreground"
                  aria-label={`Ver historial de ${exercise.exercise_name}`}
                >
                  <History className="size-4.5" />
                </Link>
              </div>
              <div className="border-t px-4 py-3">
                <div className="grid grid-cols-[1.5rem_1fr_1fr_1.5rem] items-center gap-2 pb-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  <span>#</span>
                  <span>{cardio ? "Minutos" : "Peso"}</span>
                  <span>{cardio ? "Nivel" : "Reps"}</span>
                  <span />
                </div>
                <div className="flex flex-col gap-1.5">
                  {exercise.sets.map((set) => {
                    const log = logBySetId.get(set.id);
                    return (
                      <div
                        key={set.id}
                        className="grid grid-cols-[1.5rem_1fr_1fr_1.5rem] items-center gap-2 text-sm"
                      >
                        <span className="text-muted-foreground">{set.set_number}</span>
                        <span className="tabular-nums">
                          {cardio
                            ? (log?.actual_minutes ? `${log.actual_minutes} min` : "—")
                            : log?.actual_weight
                              ? `${log.actual_weight} kg`
                              : "—"}
                        </span>
                        <span className="tabular-nums">
                          {cardio ? (log?.actual_level ?? "—") : (log?.actual_reps ?? "—")}
                        </span>
                        {log?.is_completed ? (
                          <Check className="size-4 text-primary" />
                        ) : (
                          <Minus className={cn("size-4 text-muted-foreground/40")} />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
