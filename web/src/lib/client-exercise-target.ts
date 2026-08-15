import type { SessionExerciseInfo } from "@/lib/types/client-panel";

export function isCardioGroup(muscleGroup: string): boolean {
  return muscleGroup === "cardio";
}

/** Línea "2 series de 8-12 repeticiones, 90s de descanso" (o su
 * equivalente en minutos/nivel si es cardio) a partir de las series
 * objetivo de un ejercicio dentro de una rutina. */
export function summarizeTarget(exercise: SessionExerciseInfo): string {
  const { sets } = exercise;
  if (sets.length === 0) return "Sin series definidas";
  const setLabel = `${sets.length} serie${sets.length > 1 ? "s" : ""}`;

  if (isCardioGroup(exercise.muscle_group)) {
    const minutes = sets.map((s) => s.target_minutes).filter((v): v is number => v != null);
    const levels = sets.map((s) => s.target_level).filter((v): v is number => v != null);
    const minutesLabel = minutes.length
      ? Math.min(...minutes) === Math.max(...minutes)
        ? `${minutes[0]} min`
        : `${Math.min(...minutes)}-${Math.max(...minutes)} min`
      : null;
    const levelLabel = levels.length
      ? Math.min(...levels) === Math.max(...levels)
        ? `nivel ${levels[0]}`
        : `nivel ${Math.min(...levels)}-${Math.max(...levels)}`
      : null;
    return [setLabel, minutesLabel, levelLabel].filter(Boolean).join(" de ");
  }

  const repsMin = sets.map((s) => s.target_reps_min).filter((v): v is number => v != null);
  const repsMax = sets.map((s) => s.target_reps_max).filter((v): v is number => v != null);
  const rest = sets.map((s) => s.rest_seconds).filter((v): v is number => v != null);
  const repsLabel =
    repsMin.length && repsMax.length
      ? Math.min(...repsMin) === Math.max(...repsMax)
        ? `${Math.min(...repsMin)} reps`
        : `${Math.min(...repsMin)}-${Math.max(...repsMax)} reps`
      : null;
  const restLabel = rest.length ? `${Math.max(...rest)}s de descanso` : null;
  return [setLabel, repsLabel && `de ${repsLabel}`, restLabel && `con ${restLabel}`].filter(Boolean).join(" ");
}
