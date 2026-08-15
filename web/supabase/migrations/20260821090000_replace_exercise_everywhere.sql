-- Al editar un ejercicio que no es tuyo (esencial de Areté o de otro
-- entrenador), la app ya creaba tu propia copia personalizada
-- (fork-on-edit) — pero esa copia quedaba huérfana: las rutinas que ya
-- usaban el ejercicio original (por ejemplo, una rutina armada con IA)
-- seguían apuntando al original sin video/nombre nuevo, y el historial y
-- la evolución de tus clientes para ese ejercicio tampoco se movían a la
-- copia. Esta función reemplaza el ejercicio original por tu copia en
-- TODO lo que te pertenece a ti (tus rutinas, el historial/evolución de
-- tus propios clientes) — nunca toca las rutinas ni los clientes de
-- otros entrenadores, ni la comunidad.
--
-- security definer porque el entrenador no tiene (ni debe tener) permiso
-- de UPDATE directo sobre client_set_logs de sus clientes — esta función
-- valida internamente que la copia sea de verdad suya y un fork del
-- original antes de tocar nada.
create or replace function public.replace_exercise_everywhere(
  p_original_exercise_id uuid,
  p_new_exercise_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_new_trainer_id uuid;
  v_new_forked_from uuid;
begin
  select trainer_id, forked_from
    into v_new_trainer_id, v_new_forked_from
    from public.exercises
    where id = p_new_exercise_id;

  if v_new_trainer_id is null or v_new_trainer_id is distinct from auth.uid() then
    raise exception 'No tienes permiso sobre el ejercicio de reemplazo.';
  end if;

  if v_new_forked_from is distinct from p_original_exercise_id then
    raise exception 'El ejercicio de reemplazo no es una copia del original.';
  end if;

  update public.routine_exercises
  set exercise_id = p_new_exercise_id
  where exercise_id = p_original_exercise_id
    and routine_id in (select id from public.routines where trainer_id = auth.uid());

  update public.client_set_logs
  set exercise_id = p_new_exercise_id
  where exercise_id = p_original_exercise_id
    and client_id in (select id from public.profiles where trainer_id = auth.uid());
end;
$$;

revoke all on function public.replace_exercise_everywhere(uuid, uuid) from public;
grant execute on function public.replace_exercise_everywhere(uuid, uuid) to authenticated;
