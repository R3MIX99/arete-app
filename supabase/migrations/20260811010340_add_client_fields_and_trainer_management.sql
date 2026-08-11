-- Objetivo principal del cliente.
create type public.client_goal as enum (
  'lose_weight',
  'gain_muscle',
  'maintenance',
  'performance'
);

-- Estado del cliente. La baja es logica: nunca se borra el registro, se
-- marca como 'inactive' para conservar su historial de progreso.
create type public.client_status as enum ('active', 'inactive');

alter table public.profiles
  add column goal public.client_goal,
  add column health_notes text,
  add column phone text,
  add column status public.client_status not null default 'active';

comment on column public.profiles.goal is
  'Objetivo principal del cliente. Solo aplica cuando role = client.';
comment on column public.profiles.health_notes is
  'Restricciones alimentarias o de salud relevantes para armar rutina y dieta.';
comment on column public.profiles.status is
  'Baja logica del cliente: inactive lo oculta del listado activo pero conserva su historial.';

create index profiles_trainer_status_idx
  on public.profiles (trainer_id, status)
  where trainer_id is not null;

-- La invitacion lleva los datos que el entrenador ya cargo, para que al
-- registrarse el cliente no tenga que repetirlos.
alter table public.client_invitations
  add column full_name text,
  add column goal public.client_goal,
  add column health_notes text;

-- Un entrenador puede editar a sus propios clientes (para eso es este
-- modulo). La restriccion de que solo toque a los suyos va en la politica;
-- la de que solo pueda tocar ciertas COLUMNAS va en los grants de abajo.
create policy "profiles_update_trainer_manages_clients"
  on public.profiles for update
  using (trainer_id = auth.uid() and public.current_user_role() = 'trainer')
  with check (trainer_id = auth.uid());

-- Sin esto, un entrenador con permiso de UPDATE sobre la fila de su
-- cliente podria cambiarle el rol a 'superadmin' o reasignarlo a otro
-- entrenador: RLS filtra filas, no columnas. Los grants por columna
-- cierran ese hueco para todos los usuarios de la API, incluidos los que
-- editan su propio perfil.
revoke update on public.profiles from authenticated;
grant update (full_name, avatar_url, goal, health_notes, phone, status)
  on public.profiles to authenticated;
