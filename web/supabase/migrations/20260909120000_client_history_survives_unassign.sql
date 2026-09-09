-- Al desasignar a un cliente (unassign_client), se borran sus
-- client_assignments vigentes con ese entrenador — necesario para que no
-- vea mezclada la rutina/programa viejos con los del entrenador nuevo si
-- se une a otro. El historial y la evolución (client_sessions,
-- client_set_logs) se dejan intactos a propósito (ver comentario de
-- unassign_client), pero las políticas de RLS que le permiten al cliente
-- LEER routines/exercises solo cubrían "lo que tiene asignado ahora"
-- (client_can_see_routine, encadenado a client_assignments) — nunca "lo
-- que ya entrenó". Resultado: en cuanto se borraba la asignación, el
-- nombre de la rutina y de cada ejercicio dejaba de ser visible para el
-- cliente (RLS los bloqueaba), aunque las series que sí registró seguían
-- ahí — Historial y Evolución se veían rotos.
--
-- Se agregan dos políticas adicionales (las políticas de RLS se
-- combinan con OR, no reemplazan a las existentes): el cliente también
-- puede leer una rutina si ya tiene una client_sessions con ese
-- routine_id, y un ejercicio si ya tiene un client_set_logs con ese
-- exercise_id — sin importar si sigue asignado o no.

create or replace function public.client_has_session_for_routine(p_routine_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from public.client_sessions cs
    where cs.client_id = auth.uid() and cs.routine_id = p_routine_id
  );
$$;

create or replace function public.client_has_trained_exercise(p_exercise_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from public.client_set_logs csl
    where csl.client_id = auth.uid() and csl.exercise_id = p_exercise_id
  );
$$;

create policy "routines_select_history_as_client"
  on public.routines for select
  to authenticated
  using (public.client_has_session_for_routine(id));

create policy "exercises_select_history_as_client"
  on public.exercises for select
  to authenticated
  using (public.client_has_trained_exercise(id));

comment on function public.client_has_session_for_routine(uuid) is 'Para RLS: el cliente ya entrenó esta rutina alguna vez (client_sessions), sin importar si la sigue teniendo asignada.';
comment on function public.client_has_trained_exercise(uuid) is 'Para RLS: el cliente ya registró series de este ejercicio alguna vez (client_set_logs), sin importar si sigue en alguna rutina asignada.';
