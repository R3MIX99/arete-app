-- Biblioteca de ejercicios de cada entrenador: nombre, grupo muscular,
-- equipo necesario, descripción y video de referencia en YouTube.
create type public.exercise_muscle_group as enum (
  'chest', 'back', 'shoulders', 'arms', 'legs', 'core', 'cardio', 'full_body'
);

create type public.exercise_equipment as enum (
  'bodyweight', 'barbell', 'dumbbell', 'machine', 'cable',
  'kettlebell', 'resistance_band', 'bench', 'other'
);

create table public.exercises (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  muscle_group public.exercise_muscle_group not null,
  equipment public.exercise_equipment not null default 'other',
  description text,
  video_url text,
  created_at timestamptz not null default now(),
  constraint exercises_video_url_is_youtube check (
    video_url is null or video_url ~* (
      '^https?://(www\.)?(youtube\.com/(watch\?v=|embed/|shorts/)[A-Za-z0-9_-]{6,}' ||
      '|youtu\.be/[A-Za-z0-9_-]{6,})'
    )
  )
);

comment on table public.exercises is
  'Ejercicio de la biblioteca de un entrenador, con video de referencia de YouTube. Cada entrenador arma y ve solo su propia biblioteca.';
comment on column public.exercises.video_url is
  'Enlace de YouTube (watch, youtu.be, embed o shorts). Validado por constraint, no solo en la app.';

create index exercises_trainer_id_idx on public.exercises (trainer_id);
create index exercises_muscle_group_idx on public.exercises (muscle_group);
create index exercises_equipment_idx on public.exercises (equipment);

alter table public.exercises enable row level security;

-- Un entrenador maneja únicamente su propia biblioteca: sin lectura
-- cruzada entre entrenadores por ahora (cada uno arma la suya).
create policy "exercises_select_own"
  on public.exercises for select
  using (trainer_id = auth.uid());

create policy "exercises_insert_own_as_trainer"
  on public.exercises for insert
  with check (
    trainer_id = auth.uid()
    and public.current_user_role() = 'trainer'
  );

create policy "exercises_update_own"
  on public.exercises for update
  using (trainer_id = auth.uid())
  with check (trainer_id = auth.uid());

create policy "exercises_delete_own"
  on public.exercises for delete
  using (trainer_id = auth.uid());

-- El superadmin puede ver toda la biblioteca (soporte/auditoría).
create policy "exercises_select_superadmin_sees_all"
  on public.exercises for select
  using (public.current_user_role() = 'superadmin');
