import { redirect } from "next/navigation";
import Link from "next/link";
import { Check, ChevronLeft, Clock, Flame, Footprints, History, Minus, Route, Star, Target } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { fetchCompletedSessionView } from "@/lib/server/completed-session-view";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ExerciseVideoButton } from "@/components/client/exercise-video-button";

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

  const sessionView = await fetchCompletedSessionView(supabase, id, user.id);
  if (!sessionView) redirect("/cliente/entrenamiento");
  const {
    routineName,
    sessionDate,
    durationSeconds,
    exercises,
    difficultyLevel,
    ratingStars,
    caloriesBurned,
    distanceKm,
    stepsCount,
    clientComment,
  } = sessionView;
  const hasFeedback =
    difficultyLevel !== null ||
    ratingStars !== null ||
    caloriesBurned !== null ||
    distanceKm !== null ||
    stepsCount !== null ||
    Boolean(clientComment);

  const totalSets = exercises.reduce((acc, e) => acc + e.sets.length, 0);
  const completedSets = exercises.reduce(
    (acc, e) => acc + e.sets.filter((s) => s.isCompleted).length,
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
          <p className="text-xs text-muted-foreground">{formatDate(sessionDate)}</p>
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
              {durationSeconds ? formatDuration(durationSeconds) : "—"}
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

      {hasFeedback ? (
        <div className="px-4">
          <div className="glass-card flex flex-col gap-2.5 rounded-xl p-4">
            {difficultyLevel !== null ? (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Dificultad</span>
                <span className="font-medium tabular-nums">{difficultyLevel}/10</span>
              </div>
            ) : null}
            {ratingStars !== null ? (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Tu calificación</span>
                <span className="flex items-center gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={cn("size-3.5", i < ratingStars ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30")}
                    />
                  ))}
                </span>
              </div>
            ) : null}
            {caloriesBurned !== null || distanceKm !== null || stepsCount !== null ? (
              <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                {caloriesBurned !== null ? (
                  <span className="flex items-center gap-1">
                    <Flame className="size-3.5" /> {caloriesBurned} kcal
                  </span>
                ) : null}
                {distanceKm !== null ? (
                  <span className="flex items-center gap-1">
                    <Route className="size-3.5" /> {distanceKm} km
                  </span>
                ) : null}
                {stepsCount !== null ? (
                  <span className="flex items-center gap-1">
                    <Footprints className="size-3.5" /> {stepsCount} pasos
                  </span>
                ) : null}
              </div>
            ) : null}
            {clientComment ? <p className="text-sm">{clientComment}</p> : null}
          </div>
        </div>
      ) : null}

      <div className="flex flex-col gap-3 px-4">
        {exercises.map((exercise) => {
          const cardio = isCardio(exercise.muscleGroup);
          return (
            <div key={exercise.exerciseId} className="glass-card overflow-hidden rounded-xl">
              <div className="flex items-center gap-3 px-4 py-3">
                <p className="min-w-0 flex-1 truncate text-sm font-medium">{exercise.exerciseName}</p>
                {exercise.videoUrl ? (
                  <ExerciseVideoButton videoUrl={exercise.videoUrl} exerciseName={exercise.exerciseName} />
                ) : null}
                <Link
                  href={`/cliente/entrenamiento/evolucion/${exercise.exerciseId}?name=${encodeURIComponent(exercise.exerciseName)}&muscle=${encodeURIComponent(exercise.muscleGroup)}`}
                  className="shrink-0 text-muted-foreground hover:text-foreground"
                  aria-label={`Ver historial de ${exercise.exerciseName}`}
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
                  {exercise.sets.map((set, i) => (
                    <div
                      key={i}
                      className="grid grid-cols-[1.5rem_1fr_1fr_1.5rem] items-center gap-2 text-sm"
                    >
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
            </div>
          );
        })}
      </div>
    </div>
  );
}
