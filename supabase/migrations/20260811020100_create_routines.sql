-- Rutinas de entrenamiento: plantillas reutilizables que el entrenador arma
-- agregando ejercicios de su biblioteca. Cada ejercicio dentro de la rutina
-- tiene sus propias series (routine_exercise_sets); cada serie es un
-- registro independiente, no un número fijo por ejercicio, para poder
-- definir esquemas como series piramidales (primera serie más liviana y
-- repeticiones altas, última más pesada y repeticiones bajas).
create type public.routine_level as enum (
  'beginner', 'intermediate', 'advanced'
);

create table public.routines (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  description text,
  -- Reutiliza el mismo enum de objetivo que ya usa el perfil del cliente
  -- (perder peso, ganar músculo, mantenimiento, rendimiento): es el mismo
  -- concepto, no dos catálogos distintos que puedan desalinearse.
  goal public.client_goal,
  level public.routine_level not null default 'beginner',
  created_at timestamptz not null default now(),
  -- Puntaje de IA de la rutina: estructura lista desde ahora, sin ningún
  -- proceso que la llene todavía. Se implementa en la Fase 8.
  ai_score numeric,
  ai_score_summary text,
  ai_analyzed_at timestamptz
);

comment on table public.routines is
  'Plantilla de rutina de entrenamiento creada por un entrenador. No asigna clientes directamente (eso vive en el módulo de Programas).';
comment on column public.routines.ai_score is
  'Puntaje que le da el análisis de IA a la rutina. Columna preparada en la Fase 6; el análisis en sí se implementa en la Fase 8.';
comment on column public.routines.ai_score_summary is
  'Explicación en texto del puntaje de IA. Fase 8.';
comment on column public.routines.ai_analyzed_at is
  'Cuándo se calculó el puntaje de IA por última vez. Fase 8.';

create index routines_trainer_id_idx on public.routines (trainer_id);

alter table public.routines enable row level security;

create policy "routines_select_own"
  on public.routines for select
  using (trainer_id = auth.uid());

create policy "routines_insert_own_as_trainer"
  on public.routines for insert
  with check (
    trainer_id = auth.uid()
    and public.current_user_role() = 'trainer'
  );

create policy "routines_update_own"
  on public.routines for update
  using (trainer_id = auth.uid())
  with check (trainer_id = auth.uid());

create policy "routines_delete_own"
  on public.routines for delete
  using (trainer_id = auth.uid());

create policy "routines_select_superadmin_sees_all"
  on public.routines for select
  using (public.current_user_role() = 'superadmin');

-- Ejercicios dentro de una rutina, en orden.
create table public.routine_exercises (
  id uuid primary key default gen_random_uuid(),
  routine_id uuid not null references public.routines (id) on delete cascade,
  exercise_id uuid not null references public.exercises (id) on delete restrict,
  order_index integer not null,
  notes text,
  created_at timestamptz not null default now()
);

comment on table public.routine_exercises is
  'Un ejercicio de la biblioteca dentro de una rutina, con su posición y notas. Las series de este ejercicio viven en routine_exercise_sets.';

create index routine_exercises_routine_id_idx on public.routine_exercises (routine_id);
create index routine_exercises_exercise_id_idx on public.routine_exercises (exercise_id);

alter table public.routine_exercises enable row level security;

-- No hay trainer_id directo en esta tabla: la propiedad se resuelve
-- siempre a través de la rutina dueña.
create policy "routine_exercises_select_own"
  on public.routine_exercises for select
  using (
    exists (
      select 1 from public.routines r
      where r.id = routine_exercises.routine_id and r.trainer_id = auth.uid()
    )
  );

create policy "routine_exercises_insert_own"
  on public.routine_exercises for insert
  with check (
    exists (
      select 1 from public.routines r
      where r.id = routine_exercises.routine_id and r.trainer_id = auth.uid()
    )
  );

create policy "routine_exercises_update_own"
  on public.routine_exercises for update
  using (
    exists (
      select 1 from public.routines r
      where r.id = routine_exercises.routine_id and r.trainer_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.routines r
      where r.id = routine_exercises.routine_id and r.trainer_id = auth.uid()
    )
  );

create policy "routine_exercises_delete_own"
  on public.routine_exercises for delete
  using (
    exists (
      select 1 from public.routines r
      where r.id = routine_exercises.routine_id and r.trainer_id = auth.uid()
    )
  );

-- Series de un ejercicio dentro de una rutina. Cada serie es su propio
-- registro para poder variar reps/peso/descanso serie a serie.
create table public.routine_exercise_sets (
  id uuid primary key default gen_random_uuid(),
  routine_exercise_id uuid not null
    references public.routine_exercises (id) on delete cascade,
  set_number integer not null,
  target_reps_min integer not null,
  target_reps_max integer not null,
  suggested_weight numeric,
  rest_seconds integer not null default 60,
  constraint routine_exercise_sets_set_number_positive check (set_number > 0),
  constraint routine_exercise_sets_reps_positive check (target_reps_min > 0),
  constraint routine_exercise_sets_reps_range check (
    target_reps_max >= target_reps_min
  ),
  constraint routine_exercise_sets_rest_non_negative check (rest_seconds >= 0),
  constraint routine_exercise_sets_weight_non_negative check (
    suggested_weight is null or suggested_weight >= 0
  ),
  unique (routine_exercise_id, set_number)
);

comment on table public.routine_exercise_sets is
  'Una serie individual de un ejercicio dentro de una rutina: rango de repeticiones, peso sugerido opcional y descanso propios, para poder armar esquemas como series piramidales.';

create index routine_exercise_sets_routine_exercise_id_idx
  on public.routine_exercise_sets (routine_exercise_id);

alter table public.routine_exercise_sets enable row level security;

create policy "routine_exercise_sets_select_own"
  on public.routine_exercise_sets for select
  using (
    exists (
      select 1 from public.routine_exercises re
      join public.routines r on r.id = re.routine_id
      where re.id = routine_exercise_sets.routine_exercise_id
        and r.trainer_id = auth.uid()
    )
  );

create policy "routine_exercise_sets_insert_own"
  on public.routine_exercise_sets for insert
  with check (
    exists (
      select 1 from public.routine_exercises re
      join public.routines r on r.id = re.routine_id
      where re.id = routine_exercise_sets.routine_exercise_id
        and r.trainer_id = auth.uid()
    )
  );

create policy "routine_exercise_sets_update_own"
  on public.routine_exercise_sets for update
  using (
    exists (
      select 1 from public.routine_exercises re
      join public.routines r on r.id = re.routine_id
      where re.id = routine_exercise_sets.routine_exercise_id
        and r.trainer_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.routine_exercises re
      join public.routines r on r.id = re.routine_id
      where re.id = routine_exercise_sets.routine_exercise_id
        and r.trainer_id = auth.uid()
    )
  );

create policy "routine_exercise_sets_delete_own"
  on public.routine_exercise_sets for delete
  using (
    exists (
      select 1 from public.routine_exercises re
      join public.routines r on r.id = re.routine_id
      where re.id = routine_exercise_sets.routine_exercise_id
        and r.trainer_id = auth.uid()
    )
  );
