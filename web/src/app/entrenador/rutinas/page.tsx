import { createClient } from "@/lib/supabase/server";
import { RoutinesBrowser } from "@/components/trainer/routines-browser";
import type { RoutineSummary, RoutineSummaryWithFeedback, RoutineSessionComment } from "@/lib/types/routine";

interface FeedbackRow {
  routine_id: string | null;
  session_date: string;
  difficulty_level: number | null;
  rating_stars: number | null;
  calories_burned: number | null;
  distance_km: number | null;
  steps_count: number | null;
  client_comment: string | null;
  profiles: { full_name: string } | { full_name: string }[] | null;
}

function one<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export default async function RoutinesPage() {
  const supabase = await createClient();

  const [{ data: routines }, { data: feedbackRows }] = await Promise.all([
    supabase
      .from("routines")
      .select("id, name, description, level, goal, created_at, routine_exercises(count)")
      .order("created_at", { ascending: false }),
    supabase
      .from("client_sessions")
      .select(
        "routine_id, session_date, difficulty_level, rating_stars, calories_burned, distance_km, steps_count, client_comment, profiles!client_sessions_client_id_fkey(full_name)",
      )
      .eq("status", "completed")
      .not("routine_id", "is", null)
      .order("session_date", { ascending: false }),
  ]);

  // Se agregan calificación y comentarios por rutina en JS en lugar de
  // con una vista SQL — el volumen de sesiones completadas por
  // entrenador es chico y así no hace falta otra migración solo para
  // este agregado.
  const ratingsByRoutine = new Map<string, number[]>();
  const commentsByRoutine = new Map<string, RoutineSessionComment[]>();
  for (const row of (feedbackRows ?? []) as FeedbackRow[]) {
    if (!row.routine_id) continue;
    if (row.rating_stars) {
      const list = ratingsByRoutine.get(row.routine_id) ?? [];
      list.push(row.rating_stars);
      ratingsByRoutine.set(row.routine_id, list);
    }
    if (row.client_comment && row.client_comment.trim()) {
      const list = commentsByRoutine.get(row.routine_id) ?? [];
      list.push({
        clientName: one(row.profiles)?.full_name ?? "Cliente",
        sessionDate: row.session_date,
        comment: row.client_comment.trim(),
        difficultyLevel: row.difficulty_level,
        ratingStars: row.rating_stars,
        caloriesBurned: row.calories_burned,
        distanceKm: row.distance_km,
        stepsCount: row.steps_count,
      });
      commentsByRoutine.set(row.routine_id, list);
    }
  }

  const withFeedback: RoutineSummaryWithFeedback[] = ((routines ?? []) as RoutineSummary[]).map((r) => {
    const ratings = ratingsByRoutine.get(r.id) ?? [];
    return {
      ...r,
      avgRating: ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null,
      ratingCount: ratings.length,
      comments: commentsByRoutine.get(r.id) ?? [],
    };
  });

  return <RoutinesBrowser routines={withFeedback} />;
}
