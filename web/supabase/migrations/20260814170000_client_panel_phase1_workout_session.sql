-- Fase 9 (adaptada a Next.js): Panel de Cliente — Inicio y Entrenamiento.
--
-- 1) RLS: hasta ahora routines/routine_exercises/routine_exercise_sets/
--    programs/program_routines/exercises solo eran visibles para el
--    entrenador dueño. El cliente nunca podía leer el contenido de lo
--    que se le asignó (solo client_assignments/assignment_overrides ya
--    tenían política de cliente). Se agrega visibilidad de solo
--    lectura para el cliente, siguiendo la cadena de sus asignaciones.
--
-- 2) client_sessions: registro de una sesión de entrenamiento del
--    cliente (inicio/fin/duración/estado), para poder retomarla si
--    cierra la app a medias.
--
-- 3) client_set_logs gana session_id (a qué sesión pertenece) e
--    is_completed (distingue "guardado mientras escribe" de "serie
--    marcada como hecha"), más políticas de UPDATE/DELETE para el
--    cliente dueño del registro.

create or replace function public.client_can_see_routine(p_routine_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from public.client_assignments ca
    where ca.client_id = auth.uid() and ca.routine_id = p_routine_id
  )
  or exists (
    select 1 from public.client_assignments ca
    join public.program_routines pr on pr.program_id = ca.program_id
    where ca.client_id = auth.uid() and pr.routine_id = p_routine_id
  )
  or exists (
    select 1 from public.assignment_overrides ao
    join public.client_assignments ca on ca.id = ao.assignment_id
    where ca.client_id = auth.uid() and ao.routine_id = p_routine_id
  );
$$;

create policy "routines_select_own_as_client"
  on public.routines for select
  to authenticated
  using (public.client_can_see_routine(id));

create policy "programs_select_own_as_client"
  on public.programs for select
  to authenticated
  using (
    exists (
      select 1 from public.client_assignments ca
      where ca.client_id = auth.uid() and ca.program_id = programs.id
    )
  );

create policy "program_routines_select_own_as_client"
  on public.program_routines for select
  to authenticated
  using (
    exists (
      select 1 from public.client_assignments ca
      where ca.client_id = auth.uid() and ca.program_id = program_routines.program_id
    )
  );

create policy "routine_exercises_select_own_as_client"
  on public.routine_exercises for select
  to authenticated
  using (public.client_can_see_routine(routine_id));

create policy "routine_exercise_sets_select_own_as_client"
  on public.routine_exercise_sets for select
  to authenticated
  using (
    exists (
      select 1 from public.routine_exercises re
      where re.id = routine_exercise_sets.routine_exercise_id
        and public.client_can_see_routine(re.routine_id)
    )
  );

create policy "exercises_select_own_as_client"
  on public.exercises for select
  to authenticated
  using (
    exists (
      select 1 from public.routine_exercises re
      where re.exercise_id = exercises.id
        and public.client_can_see_routine(re.routine_id)
    )
  );

-- Sesión de entrenamiento del cliente.
create table public.client_sessions (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles(id) on delete cascade,
  assignment_id uuid references public.client_assignments(id) on delete set null,
  routine_id uuid references public.routines(id) on delete set null,
  session_date date not null default current_date,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  duration_seconds integer,
  status text not null default 'in_progress' check (status in ('in_progress', 'completed', 'abandoned')),
  created_at timestamptz not null default now()
);
comment on table public.client_sessions is 'Una sesión de entrenamiento concreta del cliente (un día, una rutina) — permite retomarla si cierra la app a medias.';

alter table public.client_sessions enable row level security;

create policy "client_sessions_select_own_as_client"
  on public.client_sessions for select
  to authenticated
  using (client_id = auth.uid());

create policy "client_sessions_insert_own_as_client"
  on public.client_sessions for insert
  to authenticated
  with check (client_id = auth.uid());

create policy "client_sessions_update_own_as_client"
  on public.client_sessions for update
  to authenticated
  using (client_id = auth.uid())
  with check (client_id = auth.uid());

create policy "client_sessions_select_trainer_sees_clients"
  on public.client_sessions for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = client_sessions.client_id and p.trainer_id = auth.uid()
    )
  );

alter table public.client_set_logs
  add column session_id uuid references public.client_sessions(id) on delete set null,
  add column is_completed boolean not null default false;
comment on column public.client_set_logs.session_id is 'Sesión de entrenamiento a la que pertenece este registro.';
comment on column public.client_set_logs.is_completed is 'true = el cliente marcó la serie como hecha; false = valores guardados mientras escribía, todavía sin confirmar.';

create policy "client_set_logs_update_own_as_client"
  on public.client_set_logs for update
  to authenticated
  using (client_id = auth.uid())
  with check (client_id = auth.uid());

create policy "client_set_logs_delete_own_as_client"
  on public.client_set_logs for delete
  to authenticated
  using (client_id = auth.uid());
