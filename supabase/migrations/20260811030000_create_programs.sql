-- Programas: agrupan varias rutinas de la biblioteca en un plan de varias
-- semanas, asignando cada rutina a un día específico de cada semana.
-- El programa en sí es una plantilla (igual que las rutinas): no asigna
-- clientes directamente, eso vive en client_assignments.
create table public.programs (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  description text,
  duration_weeks integer not null,
  goal public.client_goal,
  created_at timestamptz not null default now(),
  constraint programs_duration_weeks_positive check (duration_weeks > 0)
);

comment on table public.programs is
  'Plantilla de programa de varias semanas creada por un entrenador, hecha de rutinas ya existentes asignadas a días específicos. No asigna clientes directamente (eso vive en client_assignments).';

create index programs_trainer_id_idx on public.programs (trainer_id);

alter table public.programs enable row level security;

create policy "programs_select_own"
  on public.programs for select
  using (trainer_id = auth.uid());

create policy "programs_insert_own_as_trainer"
  on public.programs for insert
  with check (
    trainer_id = auth.uid()
    and public.current_user_role() = 'trainer'
  );

create policy "programs_update_own"
  on public.programs for update
  using (trainer_id = auth.uid())
  with check (trainer_id = auth.uid());

create policy "programs_delete_own"
  on public.programs for delete
  using (trainer_id = auth.uid());

create policy "programs_select_superadmin_sees_all"
  on public.programs for select
  using (public.current_user_role() = 'superadmin');

-- Qué rutina corresponde a qué día de qué semana dentro del programa.
-- día_de_semana: 1 = lunes ... 7 = domingo (ISO 8601), para no depender
-- de la configuración regional del cliente.
create table public.program_routines (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.programs (id) on delete cascade,
  routine_id uuid not null references public.routines (id) on delete restrict,
  week_number integer not null,
  day_of_week integer not null,
  notes text,
  created_at timestamptz not null default now(),
  constraint program_routines_week_number_positive check (week_number > 0),
  constraint program_routines_day_of_week_range check (
    day_of_week between 1 and 7
  )
);

comment on table public.program_routines is
  'Una rutina de la biblioteca ubicada en un día y semana específicos dentro de un programa. day_of_week usa ISO 8601 (1 = lunes, 7 = domingo).';

create index program_routines_program_id_idx on public.program_routines (program_id);
create index program_routines_routine_id_idx on public.program_routines (routine_id);

alter table public.program_routines enable row level security;

-- No hay trainer_id directo: la propiedad se resuelve a través del
-- programa dueño, igual que routine_exercises con routines.
create policy "program_routines_select_own"
  on public.program_routines for select
  using (
    exists (
      select 1 from public.programs p
      where p.id = program_routines.program_id and p.trainer_id = auth.uid()
    )
  );

create policy "program_routines_insert_own"
  on public.program_routines for insert
  with check (
    exists (
      select 1 from public.programs p
      where p.id = program_routines.program_id and p.trainer_id = auth.uid()
    )
  );

create policy "program_routines_update_own"
  on public.program_routines for update
  using (
    exists (
      select 1 from public.programs p
      where p.id = program_routines.program_id and p.trainer_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.programs p
      where p.id = program_routines.program_id and p.trainer_id = auth.uid()
    )
  );

create policy "program_routines_delete_own"
  on public.program_routines for delete
  using (
    exists (
      select 1 from public.programs p
      where p.id = program_routines.program_id and p.trainer_id = auth.uid()
    )
  );
