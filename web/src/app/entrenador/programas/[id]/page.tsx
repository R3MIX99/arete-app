import { notFound, redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { ProgramBuilder } from "@/components/trainer/program-builder";
import type {
  ProgramAssignment,
  ProgramSlot,
  RoutineOption,
  SlotOverride,
} from "@/lib/types/program";
import type { ClientGoal, ClientProfile } from "@/lib/types/client";

interface ProgramRoutineRow {
  id: string;
  week_number: number;
  day_of_week: number;
  notes: string | null;
  routine_id: string;
  routines: { name: string; level: string } | { name: string; level: string }[] | null;
}

interface AssignmentRow {
  id: string;
  client_id: string;
  start_date: string;
  profiles: { full_name: string } | { full_name: string }[] | null;
}

interface OverrideRow {
  id: string;
  assignment_id: string;
  program_routine_id: string;
  routine_id: string;
  routines: { name: string } | { name: string }[] | null;
}

interface ClientRow {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  goal: ClientGoal | null;
  health_notes: string | null;
  status: ClientProfile["status"];
  created_at: string;
  trainer_id: string;
  trainer: { full_name: string } | { full_name: string }[] | null;
}

function one<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export default async function ProgramDetailPage({
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

  const [
    { data: program },
    { data: programRoutines },
    { data: routines },
    { data: clients },
    { data: assignments },
    { data: profile },
  ] = await Promise.all([
    supabase
      .from("programs")
      .select(
        "id, name, description, duration_weeks, goal, trainer_id, is_shared, owner:trainer_id(full_name)",
      )
      .eq("id", id)
      .single(),
    supabase
      .from("program_routines")
      .select("id, week_number, day_of_week, notes, routine_id, routines(name, level)")
      .eq("program_id", id)
      .order("week_number")
      .order("day_of_week"),
    supabase.from("routines").select("id, name, level").order("name"),
    supabase
      .from("profiles")
      .select(
        "id, full_name, email, phone, goal, health_notes, status, created_at, trainer_id, trainer:trainer_id(full_name)",
      )
      .eq("role", "client")
      .order("full_name"),
    supabase
      .from("client_assignments")
      .select("id, client_id, start_date, profiles!client_assignments_client_id_fkey(full_name)")
      .eq("program_id", id),
    supabase.from("profiles").select("gym_id").eq("id", user.id).maybeSingle(),
  ]);

  if (!program) notFound();

  const programRow = program as typeof program & {
    owner: { full_name: string } | { full_name: string }[] | null;
  };
  const ownerName = one(programRow.owner)?.full_name ?? null;

  const clientProfiles: ClientProfile[] = ((clients ?? []) as ClientRow[]).map((row) => ({
    id: row.id,
    full_name: row.full_name,
    email: row.email,
    phone: row.phone,
    goal: row.goal,
    health_notes: row.health_notes,
    status: row.status,
    created_at: row.created_at,
    trainer_id: row.trainer_id,
    trainer_name: one(row.trainer)?.full_name ?? null,
  }));

  const slots: ProgramSlot[] = ((programRoutines ?? []) as ProgramRoutineRow[]).map((pr) => {
    const routine = one(pr.routines);
    return {
      id: pr.id,
      week_number: pr.week_number,
      day_of_week: pr.day_of_week,
      notes: pr.notes,
      routine_id: pr.routine_id,
      routine_name: routine?.name ?? "Rutina",
      routine_level: (routine?.level ?? "beginner") as ProgramSlot["routine_level"],
    };
  });

  const assignmentRows = (assignments ?? []) as AssignmentRow[];
  const programAssignments: ProgramAssignment[] = assignmentRows.map((a) => ({
    id: a.id,
    client_id: a.client_id,
    client_name: one(a.profiles)?.full_name ?? "Cliente",
    start_date: a.start_date,
  }));

  const assignmentIds = assignmentRows.map((a) => a.id);
  const overridesByAssignment: Record<string, SlotOverride[]> = {};
  if (assignmentIds.length > 0) {
    const { data: overrideRows } = await supabase
      .from("assignment_overrides")
      .select("id, assignment_id, program_routine_id, routine_id, routines(name)")
      .in("assignment_id", assignmentIds);
    for (const o of (overrideRows ?? []) as OverrideRow[]) {
      const list = overridesByAssignment[o.assignment_id] ?? [];
      list.push({
        id: o.id,
        program_routine_id: o.program_routine_id,
        routine_id: o.routine_id,
        routine_name: one(o.routines)?.name ?? "Rutina",
      });
      overridesByAssignment[o.assignment_id] = list;
    }
  }

  return (
    <ProgramBuilder
      trainerId={user.id}
      program={{
        id: program.id,
        name: program.name,
        description: program.description,
        duration_weeks: program.duration_weeks,
        goal: program.goal as ClientGoal | null,
        trainer_id: programRow.trainer_id,
        is_shared: programRow.is_shared,
        owner_name: ownerName,
      }}
      slots={slots}
      routineCatalog={(routines ?? []) as RoutineOption[]}
      clients={clientProfiles}
      assignments={programAssignments}
      overridesByAssignment={overridesByAssignment}
      isGymMember={Boolean(profile?.gym_id)}
    />
  );
}
