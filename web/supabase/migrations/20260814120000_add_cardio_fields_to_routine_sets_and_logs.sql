-- Ejercicios de cardio no usan reps/descanso: usan minutos + nivel de
-- intensidad. Se relajan los NOT NULL/checks existentes de
-- routine_exercise_sets para permitir series "de fuerza" (reps/descanso)
-- O series "de cardio" (minutos/nivel), y se agregan las columnas de
-- cardio. El registro del cliente (client_set_logs) gana las columnas
-- correspondientes de lo realmente hecho: minutos, nivel, calorías,
-- pasos y distancia.

alter table public.routine_exercise_sets
  alter column target_reps_min drop not null,
  alter column rest_seconds drop not null,
  drop constraint if exists routine_exercise_sets_target_reps_min_check;

alter table public.routine_exercise_sets
  add constraint routine_exercise_sets_target_reps_min_check
    check (target_reps_min is null or target_reps_min > 0);

alter table public.routine_exercise_sets
  add column target_minutes numeric check (target_minutes is null or target_minutes > 0),
  add column target_level integer check (target_level is null or (target_level between 1 and 10));

comment on column public.routine_exercise_sets.target_minutes is 'Minutos objetivo para una serie de cardio (nulo en series de fuerza).';
comment on column public.routine_exercise_sets.target_level is 'Nivel de intensidad objetivo (1-10) para una serie de cardio (nulo en series de fuerza).';

alter table public.client_set_logs
  add column actual_minutes numeric check (actual_minutes is null or actual_minutes > 0),
  add column actual_level integer check (actual_level is null or (actual_level between 1 and 10)),
  add column calories_burned numeric check (calories_burned is null or calories_burned >= 0),
  add column steps integer check (steps is null or steps >= 0),
  add column distance_km numeric check (distance_km is null or distance_km >= 0);

comment on column public.client_set_logs.actual_minutes is 'Minutos reales que hizo el cliente en una serie de cardio.';
comment on column public.client_set_logs.actual_level is 'Nivel de intensidad real (1-10) que hizo el cliente en una serie de cardio.';
comment on column public.client_set_logs.calories_burned is 'Calorías quemadas reportadas por el cliente en esta serie de cardio (opcional).';
comment on column public.client_set_logs.steps is 'Pasos reportados por el cliente en esta serie de cardio (opcional).';
comment on column public.client_set_logs.distance_km is 'Distancia recorrida en km reportada por el cliente en esta serie de cardio (opcional).';
