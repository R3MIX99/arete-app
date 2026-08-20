-- Permite a un entrenador "soltar" a un cliente para que pueda unirse
-- a otro entrenador — la policy de profiles no deja que un entrenador
-- cambie trainer_id directo (el WITH CHECK exige que siga siendo su
-- propio id), así que hace falta esta función SECURITY DEFINER.
--
-- Un delete de la fila del cliente no es opción: profiles.id tiene
-- client_assignments, diet_plan_assignments, client_sessions,
-- client_set_logs, progress_measurements, progress_entries,
-- client_meal_substitutions y client_notifications con ON DELETE
-- CASCADE — borraría todo el historial de entrenamiento y progreso del
-- cliente, no solo la relación con este entrenador.
--
-- Sí se borran las asignaciones vigentes de rutina/programa y de plan
-- nutricional de ESTE entrenador (client_assignments,
-- assignment_overrides en cascada, diet_plan_assignments) — si no, al
-- unirse a otro entrenador vería mezclada la rutina/dieta vieja con la
-- nueva. El historial de sesiones/series/mediciones/fotos del cliente
-- se queda intacto (es suyo, no del entrenador).
create or replace function public.unassign_client(p_client_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.profiles
    where id = p_client_id and trainer_id = auth.uid() and role = 'client'
  ) then
    raise exception 'No tienes permiso sobre este cliente.' using errcode = '42501';
  end if;

  delete from public.client_assignments
  where client_id = p_client_id and trainer_id = auth.uid();

  delete from public.diet_plan_assignments
  where client_id = p_client_id and trainer_id = auth.uid();

  update public.profiles
  set trainer_id = null
  where id = p_client_id;
end;
$$;

revoke execute on function public.unassign_client(uuid) from public, anon;
grant execute on function public.unassign_client(uuid) to authenticated;
