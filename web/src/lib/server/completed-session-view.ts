import type { SupabaseClient } from "@supabase/supabase-js";

export interface CompletedSessionSet {
  setNumber: number;
  actualReps: number | null;
  actualWeight: number | null;
  actualMinutes: number | null;
  actualLevel: number | null;
  isCompleted: boolean;
}

export interface CompletedSessionExercise {
  exerciseId: string;
  exerciseName: string;
  muscleGroup: string;
  videoUrl: string | null;
  sets: CompletedSessionSet[];
}

export interface CompletedSessionView {
  routineName: string;
  sessionDate: string;
  durationSeconds: number | null;
  exercises: CompletedSessionExercise[];
}

interface ExerciseRef {
  name: string;
  muscle_group: string;
  video_url: string | null;
}

interface SetLogRow {
  exercise_id: string;
  set_number: number;
  actual_reps: number | null;
  actual_weight: number | null;
  actual_minutes: number | null;
  actual_level: number | null;
  is_completed: boolean;
  created_at: string;
  exercises: ExerciseRef | ExerciseRef[] | null;
}

function one<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

/**
 * Detalle de una sesión ya completada, construido a partir de lo que el
 * cliente realmente registró (client_set_logs), no de la estructura
 * actual de la rutina — así, si el entrenador después edita o borra la
 * rutina (cambia ejercicios, nombres, etc.), esta vista se sigue viendo
 * exactamente igual a como quedó el día que se hizo. Solo el nombre del
 * ejercicio se toma en vivo de `exercises`, para que si el entrenador le
 * cambia el nombre a un ejercicio, el historial lo refleje sin perder
 * ningún registro.
 */
export async function fetchCompletedSessionView(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>,
  sessionId: string,
  clientId: string,
): Promise<CompletedSessionView | null> {
  const [{ data: session }, { data: logRows }] = await Promise.all([
    supabase
      .from("client_sessions")
      .select("session_date, duration_seconds, routines(name)")
      .eq("id", sessionId)
      .eq("client_id", clientId)
      .maybeSingle(),
    supabase
      .from("client_set_logs")
      .select(
        "exercise_id, set_number, actual_reps, actual_weight, actual_minutes, actual_level, is_completed, created_at, exercises(name, muscle_group, video_url)",
      )
      .eq("session_id", sessionId)
      .order("created_at"),
  ]);

  if (!session) return null;

  const byExercise = new Map<string, CompletedSessionExercise>();
  for (const row of (logRows ?? []) as unknown as SetLogRow[]) {
    const ex = one(row.exercises);
    const entry = byExercise.get(row.exercise_id) ?? {
      exerciseId: row.exercise_id,
      exerciseName: ex?.name ?? "Ejercicio",
      muscleGroup: ex?.muscle_group ?? "",
      videoUrl: ex?.video_url ?? null,
      sets: [],
    };
    entry.sets.push({
      setNumber: row.set_number,
      actualReps: row.actual_reps,
      actualWeight: row.actual_weight,
      actualMinutes: row.actual_minutes,
      actualLevel: row.actual_level,
      isCompleted: row.is_completed,
    });
    byExercise.set(row.exercise_id, entry);
  }

  const exercises = Array.from(byExercise.values()).map((e) => ({
    ...e,
    sets: e.sets.slice().sort((a, b) => a.setNumber - b.setNumber),
  }));

  return {
    routineName: one(session.routines as { name: string } | { name: string }[] | null)?.name ?? "Rutina",
    sessionDate: session.session_date as string,
    durationSeconds: session.duration_seconds as number | null,
    exercises,
  };
}
