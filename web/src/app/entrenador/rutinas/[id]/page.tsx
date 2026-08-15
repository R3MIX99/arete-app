import { notFound, redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { RoutineForm } from "@/components/trainer/routine-form";
import type {
  ExerciseOption,
  RoutineDetail,
  RoutineExerciseInput,
} from "@/lib/types/routine";

interface RoutineExerciseRow {
  id: string;
  exercise_id: string;
  order_index: number;
  notes: string | null;
  exercises:
    | { name: string; muscle_group: string; video_url: string | null }
    | { name: string; muscle_group: string; video_url: string | null }[]
    | null;
  routine_exercise_sets: {
    id: string;
    set_number: number;
    target_reps_min: number | null;
    target_reps_max: number | null;
    rest_seconds: number | null;
    target_minutes: number | null;
    target_level: number | null;
  }[];
}

export default async function RoutineDetailPage({
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

  const [{ data: routine }, { data: routineExercises }, { data: exercises }] =
    await Promise.all([
      supabase
        .from("routines")
        .select("id, name, description, level, goal, ai_score, ai_score_summary, ai_analyzed_at")
        .eq("id", id)
        .single(),
      supabase
        .from("routine_exercises")
        .select(
          "id, exercise_id, order_index, notes, exercises(name, muscle_group, video_url), routine_exercise_sets(id, set_number, target_reps_min, target_reps_max, rest_seconds, target_minutes, target_level)",
        )
        .eq("routine_id", id)
        .order("order_index")
        .order("set_number", { referencedTable: "routine_exercise_sets" }),
      supabase
        .from("exercises")
        .select("id, name, muscle_group, equipment, video_url")
        .or(`trainer_id.is.null,trainer_id.eq.${user.id}`)
        .order("name"),
    ]);

  if (!routine) notFound();

  const initialExercises: RoutineExerciseInput[] = (
    (routineExercises ?? []) as RoutineExerciseRow[]
  ).map((re) => {
    const exerciseInfo = Array.isArray(re.exercises) ? re.exercises[0] : re.exercises;
    return {
      id: re.id,
      exercise_id: re.exercise_id,
      exercise_name: exerciseInfo?.name ?? "Ejercicio",
      exercise_muscle_group: exerciseInfo?.muscle_group ?? "full_body",
      exercise_video_url: exerciseInfo?.video_url ?? null,
      order_index: re.order_index,
      notes: re.notes ?? "",
      sets: re.routine_exercise_sets.map((s) => ({
        id: s.id,
        set_number: s.set_number,
        target_reps_min: s.target_reps_min,
        target_reps_max: s.target_reps_max,
        rest_seconds: s.rest_seconds,
        target_minutes: s.target_minutes,
        target_level: s.target_level,
      })),
    };
  });

  return (
    <RoutineForm
      mode="edit"
      routine={routine as RoutineDetail}
      initialExercises={initialExercises}
      exerciseCatalog={(exercises ?? []) as ExerciseOption[]}
      trainerId={user.id}
    />
  );
}
