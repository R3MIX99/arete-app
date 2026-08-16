-- Fase 11 — Perfil del cliente.

-- 1) Preferencias de recordatorios propias del cliente. Las que ya
-- existían (notify_email / notify_push) son el CANAL por el que llegan
-- los avisos; estas dos son QUÉ avisos quiere recibir.
alter table public.profiles
  add column notify_workout_reminders boolean not null default true,
  add column notify_meal_reminders boolean not null default true,
  -- Solicitud de baja de cuenta (requisito de las tiendas de apps). No
  -- borra nada por sí sola: deja constancia de cuándo la pidió para que
  -- su entrenador/soporte la procese.
  add column deletion_requested_at timestamptz;

comment on column public.profiles.notify_workout_reminders is
  'El cliente quiere recordatorios de sus entrenamientos.';
comment on column public.profiles.notify_meal_reminders is
  'El cliente quiere recordatorios de sus comidas.';
comment on column public.profiles.deletion_requested_at is
  'Cuándo el usuario solicitó eliminar su cuenta. Null = no la ha solicitado.';

-- 2) Los grants por columna son los que de verdad limitan qué puede
-- tocar cada quien (RLS filtra filas, no columnas), así que hay que
-- sumar explícitamente las columnas nuevas — sin esto el cliente no
-- puede guardar sus propias preferencias.
grant update (
  notify_workout_reminders,
  notify_meal_reminders,
  deletion_requested_at
) on public.profiles to authenticated;

-- 3) El cliente necesita ver a su entrenador para mostrar sus datos de
-- contacto en el perfil. Hasta ahora solo existía la relación al revés
-- (el entrenador ve a sus clientes), así que esa consulta devolvía
-- vacío por RLS.
--
-- Va por una función SECURITY DEFINER, igual que current_user_role():
-- una política de profiles que consultara profiles directamente se
-- llamaría a sí misma y provocaría recursión infinita en RLS.
create function public.current_user_trainer_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select trainer_id from public.profiles where id = auth.uid();
$$;

revoke all on function public.current_user_trainer_id() from public;
grant execute on function public.current_user_trainer_id() to authenticated;

create policy "profiles_select_client_sees_own_trainer"
  on public.profiles for select
  to authenticated
  using (id = public.current_user_trainer_id());
