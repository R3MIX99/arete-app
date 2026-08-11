-- Registro de lo que el cliente realmente hizo en cada serie. La
-- estructura y las políticas quedan listas desde ahora; la pantalla del
-- cliente para registrar sus series se construye en la Fase 9.
create table public.client_set_logs (
  id uuid primary key default gen_random_uuid(),
  routine_exercise_set_id uuid not null
    references public.routine_exercise_sets (id) on delete cascade,
  client_id uuid not null references public.profiles (id) on delete cascade,
  session_date date not null default current_date,
  actual_reps integer,
  actual_weight numeric,
  completed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint client_set_logs_reps_non_negative check (
    actual_reps is null or actual_reps >= 0
  ),
  constraint client_set_logs_weight_non_negative check (
    actual_weight is null or actual_weight >= 0
  )
);

comment on table public.client_set_logs is
  'Lo que un cliente realmente hizo en una serie de su rutina (repeticiones, peso, hora). Estructura preparada en la Fase 6; la pantalla del cliente para registrar se construye en la Fase 9.';

create index client_set_logs_client_id_idx on public.client_set_logs (client_id);
create index client_set_logs_routine_exercise_set_id_idx
  on public.client_set_logs (routine_exercise_set_id);
create index client_set_logs_session_date_idx on public.client_set_logs (session_date);

alter table public.client_set_logs enable row level security;

-- El cliente ve y registra únicamente lo suyo, y solo sobre series que
-- pertenecen a una rutina de su propio entrenador.
create policy "client_set_logs_select_own"
  on public.client_set_logs for select
  using (client_id = auth.uid());

create policy "client_set_logs_insert_own_as_client"
  on public.client_set_logs for insert
  with check (
    client_id = auth.uid()
    and public.current_user_role() = 'client'
    and exists (
      select 1
      from public.routine_exercise_sets res
      join public.routine_exercises re on re.id = res.routine_exercise_id
      join public.routines r on r.id = re.routine_id
      join public.profiles me on me.id = auth.uid()
      where res.id = client_set_logs.routine_exercise_set_id
        and r.trainer_id = me.trainer_id
    )
  );

-- El entrenador ve el progreso registrado por sus propios clientes.
create policy "client_set_logs_select_trainer_sees_clients"
  on public.client_set_logs for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = client_set_logs.client_id and p.trainer_id = auth.uid()
    )
  );

create policy "client_set_logs_select_superadmin_sees_all"
  on public.client_set_logs for select
  using (public.current_user_role() = 'superadmin');
