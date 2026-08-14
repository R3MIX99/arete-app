-- Se me quedó target_reps_max como NOT NULL en la migración anterior,
-- lo cual rompía el guardado de series de cardio (que no tienen reps).
alter table public.routine_exercise_sets
  alter column target_reps_max drop not null;
