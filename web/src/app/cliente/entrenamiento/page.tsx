import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { youtubeThumbnails } from "@/lib/youtube";
import { ClientTrainingTabs } from "@/components/client/client-training-tabs";
import type { CompletedSessionRow, ClientExerciseProgress } from "@/lib/types/client-panel";
import type { ProgressMeasurement, ProgressPhotoEntry } from "@/lib/types/progress";

interface SessionRow {
  id: string;
  session_date: string;
  finished_at: string | null;
  duration_seconds: number | null;
  routines: { name: string } | { name: string }[] | null;
}

interface ExerciseRef {
  name: string;
  muscle_group: string;
  image_path: string | null;
  video_url: string | null;
}

interface SetLogRow {
  session_date: string;
  actual_weight: number | null;
  actual_reps: number | null;
  exercise_id: string;
  exercises: ExerciseRef | ExerciseRef[] | null;
}

interface CompletedSetSessionRow {
  session_id: string;
}

function one<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export default async function ClientTrainingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [
    { data: sessionRows },
    { data: measurements },
    { data: photoEntries },
    { data: setLogRows },
    { data: completedSetSessionRows },
  ] = await Promise.all([
      supabase
        .from("client_sessions")
        // 200 en vez de 40: con los filtros por rango de fechas del
        // Historial (3/6 meses, personalizado) 40 se quedaba corto para
        // un cliente que entrena seguido.
        .select("id, session_date, finished_at, duration_seconds, routines(name)")
        .eq("client_id", user.id)
        .eq("status", "completed")
        .order("session_date", { ascending: false })
        .order("finished_at", { ascending: false })
        .limit(200),
      supabase
        .from("progress_measurements")
        .select("id, entry_date, metric_key, value, notes")
        .eq("client_id", user.id)
        .order("entry_date"),
      supabase
        .from("progress_entries")
        .select("id, entry_date, photo_path, notes")
        .eq("client_id", user.id)
        .not("photo_path", "is", null)
        .order("entry_date"),
      supabase
        .from("client_set_logs")
        .select(
          "session_date, actual_weight, actual_reps, exercise_id, exercises(name, muscle_group, image_path, video_url)",
        )
        .eq("client_id", user.id)
        .eq("is_completed", true)
        .order("session_date"),
      // Solo el session_id: para contar cuántas series completadas tuvo
      // cada sesión — el insight que se muestra en la lista de Historial.
      supabase
        .from("client_set_logs")
        .select("session_id")
        .eq("client_id", user.id)
        .eq("is_completed", true),
    ]);

  const completedSetsBySession = new Map<string, number>();
  for (const row of (completedSetSessionRows ?? []) as CompletedSetSessionRow[]) {
    completedSetsBySession.set(row.session_id, (completedSetsBySession.get(row.session_id) ?? 0) + 1);
  }

  const completedSessions: CompletedSessionRow[] = ((sessionRows ?? []) as SessionRow[]).map((row) => ({
    id: row.id,
    sessionDate: row.session_date,
    routineName: one(row.routines)?.name ?? "Rutina",
    durationSeconds: row.duration_seconds,
    completedSets: completedSetsBySession.get(row.id) ?? 0,
    // Esta vista (la del propio cliente) no distingue rutina completa vs
    // a medias — eso solo se muestra en el panel del entrenador — así
    // que no vale la pena otra consulta aquí para calcularlo.
    totalSets: completedSetsBySession.get(row.id) ?? 0,
    incompleteMuscleGroups: [],
  }));

  // La lista de "Evolución" solo necesita el nombre y el grupo muscular
  // de cada ejercicio (el detalle con sus gráficas de peso/reps o
  // minutos/nivel se calcula aparte, al abrir cada ejercicio) — por eso
  // se incluye cardio aquí también, aunque no tenga actual_weight.
  const byExercise = new Map<string, ClientExerciseProgress>();
  for (const row of (setLogRows ?? []) as unknown as SetLogRow[]) {
    const exercise = one(row.exercises);
    if (!exercise) continue;

    const existing = byExercise.get(row.exercise_id) ?? {
      exerciseId: row.exercise_id,
      exerciseName: exercise.name,
      muscleGroup: exercise.muscle_group,
      logs: [],
      currentWeight: null,
      currentReps: null,
      lastDate: null,
      // Misma regla que la vista previa de una rutina: foto propia si
      // hay, si no la miniatura del video — mejor que un ícono genérico.
      imageUrl: exercise.image_path
        ? supabase.storage.from("exercise-images").getPublicUrl(exercise.image_path).data.publicUrl
        : (youtubeThumbnails(exercise.video_url)?.primary ?? null),
      imageFallbackUrl: exercise.image_path ? null : (youtubeThumbnails(exercise.video_url)?.fallback ?? null),
    };
    if (row.actual_weight !== null) {
      const existingForDate = existing.logs.find((l) => l.date === row.session_date);
      // Se guardan las reps de la serie con más peso de ese día — son
      // las que van junto al peso máximo en el chip de "ahora mismo".
      if (existingForDate) {
        if (row.actual_weight >= existingForDate.weight) {
          existingForDate.weight = row.actual_weight;
          existingForDate.reps = row.actual_reps;
        }
      } else {
        existing.logs.push({ date: row.session_date, weight: row.actual_weight, reps: row.actual_reps });
      }
    }
    byExercise.set(row.exercise_id, existing);
  }
  const exerciseProgress = Array.from(byExercise.values())
    .map((e) => {
      const sortedLogs = e.logs.sort((a, b) => a.date.localeCompare(b.date));
      const latest = sortedLogs.at(-1) ?? null;
      return {
        ...e,
        logs: sortedLogs,
        currentWeight: latest?.weight ?? null,
        currentReps: latest?.reps ?? null,
        lastDate: latest?.date ?? null,
      };
    })
    .sort((a, b) => a.exerciseName.localeCompare(b.exerciseName));

  return (
    <ClientTrainingTabs
      completedSessions={completedSessions}
      measurements={(measurements ?? []) as ProgressMeasurement[]}
      photos={(photoEntries ?? []) as ProgressPhotoEntry[]}
      exerciseProgress={exerciseProgress}
    />
  );
}
