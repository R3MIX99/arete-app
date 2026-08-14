import { redirect } from "next/navigation";
import Link from "next/link";
import { Check, ChevronLeft, Minus, PlayCircle } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/format";
import { youtubeVideoId } from "@/lib/youtube";
import { cn } from "@/lib/utils";
import type { SessionExerciseInfo, SessionSetLog } from "@/lib/types/client-panel";

interface RoutineExerciseRow {
  id: string;
  exercise_id: string;
  order_index: number;
  notes: string | null;
  exercises:
    | { name: string; muscle_group: string; equipment: string; video_url: string | null }
    | { name: string; muscle_group: string; equipment: string; video_url: string | null }[]
    | null;
  routine_exercise_sets: {
    id: string;
    set_number: number;
    target_reps_min: number | null;
    target_reps_max: number | null;
    suggested_weight: number | null;
    rest_seconds: number | null;
    target_minutes: number | null;
    target_level: number | null;
  }[];
}

function one<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

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
    .select("id, routine_id, session_date, duration_seconds, status, routines(name)")
    .eq("id", id)
    .eq("client_id", user.id)
    .maybeSingle();

  if (!session) redirect("/cliente/entrenamiento");

  const [{ data: exerciseRows }, { data: logRows }] = await Promise.all([
    supabase
      .from("routine_exercises")
      .select(
        "id, exercise_id, order_index, notes, exercises(name, muscle_group, equipment, video_url), routine_exercise_sets(id, set_number, target_reps_min, target_reps_max, suggested_weight, rest_seconds, target_minutes, target_level)",
      )
      .eq("routine_id", session.routine_id)
      .order("order_index"),
    supabase
      .from("client_set_logs")
      .select("routine_exercise_set_id, actual_reps, actual_weight, actual_minutes, actual_level, is_completed")
      .eq("session_id", id),
  ]);

  const exercises: SessionExerciseInfo[] = ((exerciseRows ?? []) as RoutineExerciseRow[]).map((row) => {
    const ex = one(row.exercises);
    return {
      id: row.id,
      exercise_id: row.exercise_id,
      exercise_name: ex?.name ?? "Ejercicio",
      muscle_group: ex?.muscle_group ?? "",
      equipment: ex?.equipment ?? "",
      video_url: ex?.video_url ?? null,
      notes: row.notes,
      order_index: row.order_index,
      sets: (row.routine_exercise_sets ?? [])
        .slice()
        .sort((a, b) => a.set_number - b.set_number)
        .map((s) => ({
          id: s.id,
          set_number: s.set_number,
          target_reps_min: s.target_reps_min,
          target_reps_max: s.target_reps_max,
          suggested_weight: s.suggested_weight,
          rest_seconds: s.rest_seconds,
          target_minutes: s.target_minutes,
          target_level: s.target_level,
        })),
    };
  });

  const logBySetId = new Map(
    ((logRows ?? []) as SessionSetLog[]).map((l) => [l.routine_exercise_set_id, l]),
  );

  const routineName = one(session.routines)?.name ?? "Rutina";

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
          <p className="text-xs text-muted-foreground">
            {formatDate(session.session_date)}
            {session.duration_seconds ? ` · ${formatDuration(session.duration_seconds)}` : ""}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-3 px-4">
        {exercises.map((exercise) => {
          const cardio = isCardio(exercise.muscle_group);
          const videoId = exercise.video_url ? youtubeVideoId(exercise.video_url) : null;
          return (
            <div key={exercise.id} className="glass-card overflow-hidden rounded-xl">
              <div className="flex items-center gap-3 px-4 py-3">
                <p className="min-w-0 flex-1 truncate text-sm font-medium">{exercise.exercise_name}</p>
                {videoId ? (
                  <a
                    href={exercise.video_url ?? undefined}
                    target="_blank"
                    rel="noreferrer"
                    className="shrink-0 text-muted-foreground hover:text-foreground"
                    aria-label="Ver video"
                  >
                    <PlayCircle className="size-4.5" />
                  </a>
                ) : null}
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
                          {cardio ? (log?.actual_minutes ?? "—") : (log?.actual_weight ?? "—")}
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
