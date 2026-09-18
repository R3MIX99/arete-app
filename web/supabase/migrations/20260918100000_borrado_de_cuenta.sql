-- Borrado de cuenta iniciado por el propio usuario (requisito de Google Play).
--
-- Los archivos de storage (fotos de progreso, logo) NO se borran aquí:
-- Storage prohíbe borrar objetos directo desde SQL. La app los quita con la
-- API de Storage justo antes de llamar a esta función.
--
-- Clientes: se elimina el usuario de auth y todo lo suyo cae en cascada
-- (sesiones, series, medidas, asignaciones, etc.).
--
-- Entrenadores/empleados: NO se puede borrar el usuario de raíz, porque en
-- cascada se irían todas sus rutinas, programas y asignaciones (los clientes
-- perderían su plan) y además hay llaves foráneas sin cascada (dueño de
-- gimnasio, invitaciones, etc.). En su lugar se anonimiza: se quitan los
-- datos personales, se cierra el acceso (sin identidades, sin sesiones,
-- usuario bloqueado) y se libera el correo para que pueda volver a registrarse.

create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = public, auth, storage
as $$
declare
  v_uid uuid := auth.uid();
  v_role public.user_role;
  v_placeholder_email text;
begin
  if v_uid is null then
    raise exception 'Debes iniciar sesión para eliminar tu cuenta.' using errcode = '42501';
  end if;

  select role into v_role from public.profiles where id = v_uid;
  if v_role is null then
    raise exception 'No se encontró tu perfil.' using errcode = 'P0001';
  end if;

  if v_role = 'superadmin' then
    raise exception 'Las cuentas de superadministrador no se pueden eliminar desde la app.'
      using errcode = 'P0001';
  end if;

  if exists (select 1 from public.gyms where owner_id = v_uid)
     or exists (
       select 1 from public.gym_members
       where profile_id = v_uid and role = 'admin' and status = 'active'
     ) then
    raise exception 'Eres administrador de un gimnasio. Escribe a soporte para cerrar tu cuenta y transferir el gimnasio.'
      using errcode = 'P0001';
  end if;

  if v_role = 'client' then
    delete from auth.users where id = v_uid;
    return;
  end if;

  -- Entrenador o empleado de gimnasio: anonimizar.
  v_placeholder_email := 'eliminada-' || v_uid || '@cuenta-eliminada.invalid';

  delete from public.client_invitations where trainer_id = v_uid and status = 'pending';
  delete from public.gym_members where profile_id = v_uid;

  update public.profiles
  set full_name = 'Cuenta eliminada',
      email = v_placeholder_email,
      phone = null,
      avatar_url = null,
      business_name = null,
      business_logo_path = null,
      health_notes = null,
      goal = null,
      height_cm = null,
      gym_id = null,
      notify_email = false,
      notify_push = false,
      notify_workout_reminders = false,
      notify_meal_reminders = false,
      status = 'inactive',
      deactivated_at = now(),
      deletion_requested_at = now()
  where id = v_uid;

  delete from auth.identities where user_id = v_uid;
  delete from auth.refresh_tokens where user_id = v_uid::text;
  delete from auth.sessions where user_id = v_uid;

  update auth.users
  set email = v_placeholder_email,
      phone = null,
      encrypted_password = null,
      raw_user_meta_data = '{}'::jsonb,
      banned_until = 'infinity'
  where id = v_uid;
end;
$$;

revoke all on function public.delete_my_account() from public;
grant execute on function public.delete_my_account() to authenticated;

-- Permite que un cliente borre sus propias fotos de progreso (la carpeta
-- del objeto es su id) — necesario para borrar la cuenta por completo.
drop policy if exists progress_photos_client_delete_own on storage.objects;
create policy progress_photos_client_delete_own on storage.objects
  for delete to authenticated
  using (bucket_id = 'progress-photos' and (storage.foldername(name))[1] = auth.uid()::text);
