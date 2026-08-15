-- Antes, client_set_logs solo se enlazaba a routine_exercise_sets (con
-- ON DELETE CASCADE hasta routine_exercises). Cada vez que un entrenador
-- editaba una rutina, la app borraba y recreaba todos sus
-- routine_exercises/routine_exercise_sets (ver routine-form.tsx) — y esa
-- cascada borraba también, de forma permanente, TODO el historial y la
-- evolución ya registrados por el cliente para esa rutina, aunque el
-- cliente no hubiera hecho nada. Lo mismo pasaba al eliminar una rutina.
--
-- Ahora cada registro guarda su propio exercise_id y set_number en el
-- momento en que el cliente lo captura, en vez de depender por completo
-- de que la estructura de la rutina siga existiendo tal cual. Así, si el
-- entrenador cambia el nombre de un ejercicio, cambia los ejercicios de
-- una rutina, o borra la rutina o el programa, el historial y la
-- evolución del cliente se quedan intactos — solo se pierde el enlace a
-- la serie planeada original (que ya no hace falta para mostrarlos).
alter table public.client_set_logs
  add column exercise_id uuid references public.exercises(id) on delete set null,
  add column set_number integer;

update public.client_set_logs csl
set
  exercise_id = re.exercise_id,
  set_number = res.set_number
from public.routine_exercise_sets res
join public.routine_exercises re on re.id = res.routine_exercise_id
where csl.routine_exercise_set_id = res.id
  and csl.exercise_id is null;

alter table public.client_set_logs
  alter column exercise_id set not null,
  alter column set_number set not null;

alter table public.client_set_logs
  drop constraint client_set_logs_routine_exercise_set_id_fkey,
  alter column routine_exercise_set_id drop not null,
  add constraint client_set_logs_routine_exercise_set_id_fkey
    foreign key (routine_exercise_set_id) references public.routine_exercise_sets(id) on delete set null;
