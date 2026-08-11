-- Asignación de un programa (o de una rutina suelta) a un cliente, con
-- fecha de inicio. Es la que hace que un programa/rutina "pase" de ser
-- una plantilla a algo que un cliente concreto tiene que hacer; el
-- calendario del cliente (Fase 9) se calcula a partir de esta tabla más
-- program_routines y start_date.
create table public.client_assignments (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null references public.profiles (id) on delete cascade,
  client_id uuid not null references public.profiles (id) on delete cascade,
  program_id uuid references public.programs (id) on delete cascade,
  routine_id uuid references public.routines (id) on delete cascade,
  start_date date not null,
  created_at timestamptz not null default now(),
  -- Es una cosa o la otra, nunca las dos ni ninguna: se asigna un
  -- programa completo o una rutina suelta, no ambos en la misma fila.
  constraint client_assignments_program_xor_routine check (
    (program_id is not null and routine_id is null)
    or (program_id is null and routine_id is not null)
  )
);

comment on table public.client_assignments is
  'Un programa o una rutina suelta asignados a un cliente concreto, con fecha de inicio. El calendario del cliente (Fase 9) se arma a partir de esta tabla.';

create index client_assignments_trainer_id_idx on public.client_assignments (trainer_id);
create index client_assignments_client_id_idx on public.client_assignments (client_id);
create index client_assignments_program_id_idx on public.client_assignments (program_id)
  where program_id is not null;
create index client_assignments_routine_id_idx on public.client_assignments (routine_id)
  where routine_id is not null;

alter table public.client_assignments enable row level security;

create policy "client_assignments_select_own_as_trainer"
  on public.client_assignments for select
  using (trainer_id = auth.uid());

-- El entrenador solo puede asignar a sus propios clientes, y solo
-- programas/rutinas de su propia biblioteca (nunca los de otro
-- entrenador ni un cliente que no sea suyo).
create policy "client_assignments_insert_own_as_trainer"
  on public.client_assignments for insert
  with check (
    trainer_id = auth.uid()
    and public.current_user_role() = 'trainer'
    and exists (
      select 1 from public.profiles c
      where c.id = client_assignments.client_id and c.trainer_id = auth.uid()
    )
    and (
      program_id is null
      or exists (
        select 1 from public.programs p
        where p.id = client_assignments.program_id and p.trainer_id = auth.uid()
      )
    )
    and (
      routine_id is null
      or exists (
        select 1 from public.routines r
        where r.id = client_assignments.routine_id and r.trainer_id = auth.uid()
      )
    )
  );

create policy "client_assignments_delete_own"
  on public.client_assignments for delete
  using (trainer_id = auth.uid());

-- El cliente ve lo que le asignaron (para su propio calendario, Fase 9).
create policy "client_assignments_select_own_as_client"
  on public.client_assignments for select
  using (client_id = auth.uid());

create policy "client_assignments_select_superadmin_sees_all"
  on public.client_assignments for select
  using (public.current_user_role() = 'superadmin');

-- Ajuste puntual: reemplaza la rutina de un día específico del programa
-- para un cliente en particular, sin tocar program_routines (la
-- plantilla, que sigue igual para cualquier otro cliente con el mismo
-- programa asignado).
create table public.assignment_overrides (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.client_assignments (id) on delete cascade,
  program_routine_id uuid not null references public.program_routines (id) on delete cascade,
  routine_id uuid not null references public.routines (id) on delete restrict,
  created_at timestamptz not null default now(),
  unique (assignment_id, program_routine_id)
);

comment on table public.assignment_overrides is
  'Reemplazo de la rutina de un día puntual del programa, solo para esta asignación (este cliente). La plantilla original en program_routines no cambia.';

create index assignment_overrides_assignment_id_idx
  on public.assignment_overrides (assignment_id);

alter table public.assignment_overrides enable row level security;

-- No hay trainer_id directo: la propiedad se resuelve a través de la
-- asignación dueña.
create policy "assignment_overrides_select_own_as_trainer"
  on public.assignment_overrides for select
  using (
    exists (
      select 1 from public.client_assignments ca
      where ca.id = assignment_overrides.assignment_id
        and ca.trainer_id = auth.uid()
    )
  );

create policy "assignment_overrides_insert_own"
  on public.assignment_overrides for insert
  with check (
    exists (
      select 1 from public.client_assignments ca
      where ca.id = assignment_overrides.assignment_id
        and ca.trainer_id = auth.uid()
    )
    and exists (
      select 1 from public.routines r
      where r.id = assignment_overrides.routine_id and r.trainer_id = auth.uid()
    )
  );

create policy "assignment_overrides_update_own"
  on public.assignment_overrides for update
  using (
    exists (
      select 1 from public.client_assignments ca
      where ca.id = assignment_overrides.assignment_id
        and ca.trainer_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.client_assignments ca
      where ca.id = assignment_overrides.assignment_id
        and ca.trainer_id = auth.uid()
    )
    and exists (
      select 1 from public.routines r
      where r.id = assignment_overrides.routine_id and r.trainer_id = auth.uid()
    )
  );

create policy "assignment_overrides_delete_own"
  on public.assignment_overrides for delete
  using (
    exists (
      select 1 from public.client_assignments ca
      where ca.id = assignment_overrides.assignment_id
        and ca.trainer_id = auth.uid()
    )
  );

-- El cliente ve los ajustes que le tocan a él (para que su calendario de
-- la Fase 9 muestre la rutina correcta, no la plantilla original).
create policy "assignment_overrides_select_own_as_client"
  on public.assignment_overrides for select
  using (
    exists (
      select 1 from public.client_assignments ca
      where ca.id = assignment_overrides.assignment_id
        and ca.client_id = auth.uid()
    )
  );
