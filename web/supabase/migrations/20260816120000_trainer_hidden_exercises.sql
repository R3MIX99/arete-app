-- Permite a un entrenador "quitar de su biblioteca" un ejercicio esencial
-- de Areté (trainer_id null) sin borrarlo para nadie más. Los ejercicios
-- propios (trainer_id = auth.uid(), ya sea creados desde cero o copiados
-- de la comunidad) ya se pueden eliminar de verdad con la policy
-- exercises_delete_own — esta tabla solo cubre el caso de "no es mío,
-- pero no lo quiero ver en mi biblioteca".
create table public.trainer_hidden_exercises (
  trainer_id uuid not null references public.profiles(id) on delete cascade,
  exercise_id uuid not null references public.exercises(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (trainer_id, exercise_id)
);

alter table public.trainer_hidden_exercises enable row level security;

create policy trainer_hidden_exercises_select_own
  on public.trainer_hidden_exercises for select
  using (trainer_id = auth.uid());

create policy trainer_hidden_exercises_insert_own
  on public.trainer_hidden_exercises for insert
  with check (trainer_id = auth.uid());

create policy trainer_hidden_exercises_delete_own
  on public.trainer_hidden_exercises for delete
  using (trainer_id = auth.uid());
