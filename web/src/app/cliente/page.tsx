import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { addDays, todayKey, type CalendarAssignment } from "@/lib/calendar-logic";
import {
  fetchActiveDietAssignment,
  fetchClientNutritionPlan,
  fetchSubstitutionsForDate,
} from "@/lib/server/client-nutrition-data";
import { ClientHomeToday } from "@/components/client/client-home-today";
import type { PersonalRecord, WeightPoint } from "@/components/client/client-highlights";
import type {
  ClientNutritionFoodRef,
  ClientNutritionPlan,
  MealSubstitutionRow,
} from "@/lib/types/client-nutrition";

type SubstitutionWithFood = MealSubstitutionRow & {
  substituteFood: ClientNutritionFoodRef | null;
};

interface ProgramRoutineRow {
  id: string;
  week_number: number;
  day_of_week: number;
  routines: { id: string; name: string } | { id: string; name: string }[] | null;
}

interface OverrideRow {
  program_routine_id: string;
  routines: { id: string; name: string } | { id: string; name: string }[] | null;
}

interface AssignmentRow {
  id: string;
  client_id: string;
  start_date: string;
  programs:
    | { name: string; duration_weeks: number; program_routines: ProgramRoutineRow[] | null }
    | { name: string; duration_weeks: number; program_routines: ProgramRoutineRow[] | null }[]
    | null;
  routines: { id: string; name: string } | { id: string; name: string }[] | null;
  assignment_overrides: OverrideRow[] | null;
}

interface ActivitySessionRow {
  session_date: string;
  duration_seconds: number | null;
}

interface WeightSetLogRow {
  session_date: string;
  actual_weight: number | null;
  exercise_id: string;
  exercises: { name: string } | { name: string }[] | null;
}

interface WeightRow {
  entry_date: string;
  value: number;
}

function one<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export default async function ClientHomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Ventana de un día antes/después de la fecha del servidor (normalmente
  // UTC) — margen de sobra para que la sesión "de hoy"/"en curso" del
  // cliente aparezca sin importar su zona horaria; el día real que se
  // muestra lo decide el navegador (ver ClientHomeToday).
  const serverToday = todayKey();
  const windowStart = addDays(serverToday, -1);
  const windowEnd = addDays(serverToday, 1);
  // Ventana amplia para la cuadrícula del mes: el mes que se pinta lo
  // decide el navegador, así que se traen ~70 días hacia atrás para que
  // el mes en curso quepa completo sin importar la zona horaria (y de
  // paso alcanza para la racha, que puede venir del mes anterior).
  const activityStart = addDays(serverToday, -70);

  const [
    { data: profile },
    { data: assignmentRows },
    { data: inProgressSessions },
    { data: completedSessions },
    { data: activitySessionRows },
    { data: setLogRows },
    { data: weightSetLogRows },
    { data: weightRows },
  ] = await Promise.all([
      supabase.from("profiles").select("full_name").eq("id", user.id).single(),
      supabase
        .from("client_assignments")
        .select(
          "id, client_id, start_date, programs(name, duration_weeks, program_routines(id, week_number, day_of_week, routines(id, name))), routines(id, name), assignment_overrides(program_routine_id, routines(id, name))",
        )
        .eq("client_id", user.id),
      supabase
        .from("client_sessions")
        .select("id, assignment_id, routine_id, session_date")
        .eq("client_id", user.id)
        .eq("status", "in_progress"),
      supabase
        .from("client_sessions")
        .select("id, assignment_id, routine_id, session_date")
        .eq("client_id", user.id)
        .eq("status", "completed")
        .gte("session_date", windowStart)
        .lte("session_date", windowEnd),
      supabase
        .from("client_sessions")
        .select("session_date, duration_seconds")
        .eq("client_id", user.id)
        .eq("status", "completed")
        .gte("session_date", activityStart),
      // Solo la fecha: el conteo de series del mes se hace contando
      // filas, no hace falta traerse los valores de cada serie.
      supabase
        .from("client_set_logs")
        .select("session_date")
        .eq("client_id", user.id)
        .eq("is_completed", true)
        .gte("session_date", activityStart),
      // Historial completo de pesos por ejercicio para detectar récords.
      // Solo series de fuerza: el cardio no tiene peso.
      supabase
        .from("client_set_logs")
        .select("session_date, actual_weight, exercise_id, exercises(name)")
        .eq("client_id", user.id)
        .eq("is_completed", true)
        .not("actual_weight", "is", null)
        .order("session_date"),
      supabase
        .from("progress_measurements")
        .select("entry_date, value")
        .eq("client_id", user.id)
        .eq("metric_key", "weight_kg")
        .order("entry_date"),
    ]);

  const assignments: CalendarAssignment[] = ((assignmentRows ?? []) as AssignmentRow[]).map((row) => {
    const program = one(row.programs);
    const routine = one(row.routines);
    const overrides: Record<string, string> = {};
    const overrideIds: Record<string, string> = {};
    for (const o of row.assignment_overrides ?? []) {
      const overrideRoutine = one(o.routines);
      overrides[o.program_routine_id] = overrideRoutine?.name ?? "";
      if (overrideRoutine?.id) overrideIds[o.program_routine_id] = overrideRoutine.id;
    }
    const slots = (program?.program_routines ?? []).map((r) => {
      const slotRoutine = one(r.routines);
      return {
        programRoutineId: r.id,
        weekNumber: r.week_number,
        dayOfWeek: r.day_of_week,
        routineId: slotRoutine?.id ?? "",
        routineName: slotRoutine?.name ?? "",
      };
    });
    return {
      assignmentId: row.id,
      clientId: row.client_id,
      clientName: "",
      startDate: row.start_date,
      isProgram: program !== null,
      programName: program?.name ?? null,
      programDurationWeeks: program?.duration_weeks ?? null,
      standaloneRoutineId: routine?.id ?? null,
      standaloneRoutineName: routine?.name ?? null,
      slots,
      overridesByProgramRoutineId: overrides,
      overrideRoutineIdByProgramRoutineId: overrideIds,
    };
  });

  const firstName = (profile?.full_name || "").trim().split(" ")[0] || "";

  // Récords: recorriendo los registros en orden cronológico, cada vez
  // que un ejercicio supera su propio máximo anterior cuenta como
  // récord. Se exige que hubiera una marca previa — el primer día que
  // haces un ejercicio no es un "récord", es simplemente el inicio.
  const bestByExercise = new Map<string, number>();
  const recordsByExercise = new Map<string, PersonalRecord>();
  for (const row of (weightSetLogRows ?? []) as WeightSetLogRow[]) {
    if (row.actual_weight === null) continue;
    const previousBest = bestByExercise.get(row.exercise_id);
    if (previousBest === undefined) {
      bestByExercise.set(row.exercise_id, row.actual_weight);
      continue;
    }
    if (row.actual_weight > previousBest) {
      bestByExercise.set(row.exercise_id, row.actual_weight);
      recordsByExercise.set(row.exercise_id, {
        exerciseId: row.exercise_id,
        exerciseName: one(row.exercises)?.name ?? "Ejercicio",
        date: row.session_date,
        weight: row.actual_weight,
      });
    }
  }
  // Solo el récord más reciente de cada ejercicio, y los 3 más nuevos:
  // la idea es celebrar lo último, no listar un historial.
  const records = Array.from(recordsByExercise.values())
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 3);

  const weightPoints: WeightPoint[] = ((weightRows ?? []) as WeightRow[]).map((r) => ({
    date: r.entry_date,
    value: r.value,
  }));

  // Plan nutricional y sus sustituciones. Los totales NO se calculan
  // aquí: dependen de qué día es para el cliente, y eso solo lo sabe su
  // navegador (el servidor corre en UTC). Se mandan los datos crudos y
  // ClientHomeToday los combina con su fecha real.
  const dietAssignment = await fetchActiveDietAssignment(supabase, user.id, serverToday);
  let nutritionPlan: ClientNutritionPlan | null = null;
  let nutritionSubstitutions: SubstitutionWithFood[] = [];
  let calorieTarget: number | null = null;
  if (dietAssignment) {
    const [plan, substitutions, { data: dietPlan }] = await Promise.all([
      fetchClientNutritionPlan(supabase, dietAssignment),
      fetchSubstitutionsForDate(supabase, user.id, serverToday),
      supabase
        .from("diet_plans")
        .select("daily_calorie_target")
        .eq("id", dietAssignment.diet_plan_id)
        .maybeSingle(),
    ]);
    nutritionPlan = plan;
    nutritionSubstitutions = substitutions;
    calorieTarget = (dietPlan?.daily_calorie_target as number | null) ?? null;
  }

  return (
    <ClientHomeToday
      firstName={firstName}
      assignments={assignments}
      inProgressSessions={inProgressSessions ?? []}
      recentCompletedSessions={completedSessions ?? []}
      monthCompletedSessions={((activitySessionRows ?? []) as ActivitySessionRow[]).map((r) => ({
        date: r.session_date,
        durationSeconds: r.duration_seconds,
      }))}
      completedSetDates={((setLogRows ?? []) as { session_date: string }[]).map(
        (r) => r.session_date,
      )}
      records={records}
      weightPoints={weightPoints}
      nutritionPlan={nutritionPlan}
      nutritionSubstitutions={nutritionSubstitutions}
      calorieTarget={calorieTarget}
    />
  );
}
