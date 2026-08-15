import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Check, Clock, History, Minus, Target } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { fetchCompletedSessionView } from "@/lib/server/completed-session-view";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
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

/** Detalle de solo lectura de una sesión de entrenamiento ya completada
 * por un cliente — misma pantalla que ve el cliente en su Historial,
 * aquí abierta por el entrenador desde el perfil del cliente. */
export default async function TrainerSessionDetailPage({
  params,
}: {
  params: Promise<{ id: string; sessionId: string }>;
}) {
  const { id: clientId, sessionId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const sessionView = await fetchCompletedSessionView(supabase, sessionId, clientId);
  if (!sessionView) redirect(`/entrenador/clientes/${clientId}`);
  const { routineName, sessionDate, durationSeconds, exercises } = sessionView;

  const totalSets = exercises.reduce((acc, e) => acc + e.sets.length, 0);
  const completedSets = exercises.reduce(
    (acc, e) => acc + e.sets.filter((s) => s.isCompleted).length,
    0,
  );

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5 p-4 pb-24 md:p-8">
      <Button asChild variant="ghost" size="sm" className="w-fit">
        <Link href={`/entrenador/clientes/${clientId}`}>
          <ArrowLeft /> Volver al cliente
        </Link>
      </Button>

      <div>
        <h1 className="text-xl font-semibold">{routineName}</h1>
        <p className="text-sm text-muted-foreground">{formatDate(sessionDate)}</p>
      </div>

      <div className="grid grid-cols-2 divide-x rounded-xl border">
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

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {exercises.map((exercise) => {
          const cardio = isCardio(exercise.muscleGroup);
          return (
            <div key={exercise.exerciseId} className="overflow-hidden rounded-xl border">
              <div className="flex items-center gap-2 border-b bg-foreground/[0.02] px-4 py-3">
                <p className="min-w-0 flex-1 truncate text-sm font-medium">{exercise.exerciseName}</p>
                {exercise.videoUrl ? (
                  <ExerciseVideoButton videoUrl={exercise.videoUrl} exerciseName={exercise.exerciseName} />
                ) : null}
                <Link
                  href={`/entrenador/clientes/${clientId}/ejercicio/${exercise.exerciseId}?name=${encodeURIComponent(exercise.exerciseName)}&muscle=${encodeURIComponent(exercise.muscleGroup)}`}
                  className="shrink-0 text-muted-foreground hover:text-foreground"
                  aria-label={`Ver historial de ${exercise.exerciseName}`}
                >
                  <History className="size-4.5" />
                </Link>
              </div>
              <div className="px-4 py-3">
                <div className="grid grid-cols-[1.5rem_1fr_1fr_1.5rem] items-center gap-2 pb-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  <span>#</span>
                  <span>{cardio ? "Minutos" : "Peso"}</span>
                  <span>{cardio ? "Nivel" : "Reps"}</span>
                  <span />
                </div>
                <div className="flex flex-col gap-1.5">
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
            </div>
          );
        })}
      </div>
    </div>
  );
}
