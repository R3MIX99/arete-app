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
  exercises: { name: string } | { name: string }[] | null;
  routine_exercise_sets: {
    id: string;
    set_number: number;
    target_reps_min: number;
    target_reps_max: number;
    rest_seconds: number;
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
        .select("id, name, description, level, goal")
        .eq("id", id)
        .single(),
      supabase
        .from("routine_exercises")
        .select(
          "id, exercise_id, order_index, notes, exercises(name), routine_exercise_sets(id, set_number, target_reps_min, target_reps_max, rest_seconds)",
        )
        .eq("routine_id", id)
        .order("order_index")
        .order("set_number", { referencedTable: "routine_exercise_sets" }),
      supabase.from("exercises").select("id, name, muscle_group, equipment").order("name"),
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
      order_index: re.order_index,
      notes: re.notes ?? "",
      sets: re.routine_exercise_sets.map((s) => ({
        id: s.id,
        set_number: s.set_number,
        target_reps_min: s.target_reps_min,
        target_reps_max: s.target_reps_max,
        rest_seconds: s.rest_seconds,
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
