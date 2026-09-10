-- ============================================================================
-- FASE A — Esquema de los 4 planes + bloqueo real del límite de clientes.
--
-- Hoy public.plans tiene client_limit pero NO se aplica en ningún lado: un
-- entrenador en Free puede invitar a todos los clientes que quiera. Esta
-- migración:
--   1. Deja los 4 planes correctos (Gratis / Pro / Estudio [ex-"Studio"] / Gym)
--      con el nuevo modelo de "clientes extra en bloques de 5".
--   2. Agrega public.trainer_subscription: cuántos bloques/seats/paquetes de IA
--      extra tiene contratados cada entrenador (mientras no haya Stripe, lo
--      edita el superadmin a mano).
--   3. Agrega las funciones para calcular el límite efectivo y bloquear el alta
--      de clientes cuando se llega al tope, con 1 semana de gracia si el
--      entrenador se pasa por haber bajado de plan.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Catálogo de planes
-- ----------------------------------------------------------------------------
alter table public.plans
  add column if not exists included_clients int,
  add column if not exists extra_block_size int not null default 5,
  add column if not exists extra_block_price_cents int,          -- null = tope duro (no admite extra)
  add column if not exists included_seats int not null default 1, -- empleados incluidos (solo Gym > 1)
  add column if not exists extra_seat_price_cents int,            -- null = no aplica
  add column if not exists ai_generations_included int not null default 0,
  add column if not exists ai_extra_pack_size int not null default 50,
  add column if not exists ai_extra_pack_price_cents int;

comment on column public.plans.included_clients is
  'Clientes activos incluidos en el plan. null = ilimitado. Reemplaza a client_limit (que se deja por compatibilidad y se elimina después).';
comment on column public.plans.extra_block_price_cents is
  'Precio mensual de un bloque de extra_block_size clientes adicionales. null = el plan no permite clientes extra (tope duro, p. ej. Gratis).';
comment on column public.plans.included_seats is
  'Empleados (seats de app) incluidos. Solo el plan Gym trae más de 1.';

-- Backfill: los planes viejos usaban client_limit como tope.
update public.plans set included_clients = client_limit where included_clients is null;

-- Gratis: 3 clientes, tope duro.
update public.plans set
  name = 'Gratis',
  price_cents = 0,
  included_clients = 3,
  client_limit = 3,
  extra_block_price_cents = null,
  ai_generations_included = 0,
  features = array[
    'Hasta 3 clientes activos',
    'Rutinas y planes nutricionales (manual)',
    'Biblioteca de ejercicios propia + comunidad',
    'Seguimiento de progreso y fotos'
  ]
where key = 'free';

-- Pro: $479, 20 incluidos, bloque de +5 por $145.
update public.plans set
  name = 'Pro',
  price_cents = 47900,
  included_clients = 20,
  client_limit = null,                 -- el tope real ahora sale de included_clients + bloques
  extra_block_price_cents = 14500,
  ai_generations_included = 0,
  features = array[
    '20 clientes incluidos',
    'Clientes extra en bloques de 5 (+$145/mes)',
    'Reportes y analítica de progreso',
    'Recordatorios y notificaciones automáticas',
    'Soporte prioritario por chat'
  ]
where key = 'pro';

-- studio -> se renombra a "Estudio" (el key se queda como 'studio' porque
-- profiles.subscription_plan lo referencia por FK). $1,649, 150 incluidos,
-- bloque de +5 por $95, 60 generaciones de IA/mes.
update public.plans set
  name = 'Estudio',
  price_cents = 164900,
  included_clients = 150,
  client_limit = null,
  extra_block_price_cents = 9500,
  ai_generations_included = 60,
  ai_extra_pack_size = 50,
  ai_extra_pack_price_cents = 16900,
  features = array[
    '150 clientes incluidos',
    'Clientes extra en bloques de 5 (+$95/mes)',
    'Generar rutinas y dietas con IA — 60/mes',
    'Marca propia (logo, nombre y colores)',
    'Soporte prioritario dedicado'
  ]
where key = 'studio';

-- Gym: plan de equipo. $2,499, 500 clientes de bolsa global, 10 empleados
-- incluidos, empleado extra $199/seat, bloque de +5 clientes por $60, 150
-- generaciones de IA/mes compartidas.
insert into public.plans
  (key, name, price_cents, currency, client_limit, included_clients,
   extra_block_size, extra_block_price_cents, included_seats, extra_seat_price_cents,
   ai_generations_included, ai_extra_pack_size, ai_extra_pack_price_cents,
   features, sort_order, is_active)
values
  ('gym', 'Gym', 249900, 'MXN', null, 500,
   5, 6000, 10, 19900,
   150, 50, 16900,
   array[
     '500 clientes incluidos (bolsa global del gimnasio)',
     '10 empleados incluidos (roles mixtos)',
     'Empleado extra: +$199/mes por seat',
     'Clientes extra en bloques de 5 (+$60/mes)',
     'Panel de supervisor: ve todo el gimnasio',
     'IA — 150 generaciones/mes compartidas',
     'Marca propia (white-label)',
     'Soporte dedicado'
   ],
   3, true)
on conflict (key) do update set
  name = excluded.name,
  price_cents = excluded.price_cents,
  included_clients = excluded.included_clients,
  extra_block_size = excluded.extra_block_size,
  extra_block_price_cents = excluded.extra_block_price_cents,
  included_seats = excluded.included_seats,
  extra_seat_price_cents = excluded.extra_seat_price_cents,
  ai_generations_included = excluded.ai_generations_included,
  ai_extra_pack_size = excluded.ai_extra_pack_size,
  ai_extra_pack_price_cents = excluded.ai_extra_pack_price_cents,
  features = excluded.features,
  sort_order = excluded.sort_order,
  is_active = excluded.is_active;

-- ----------------------------------------------------------------------------
-- 2. trainer_subscription — extras contratados por cada entrenador
-- ----------------------------------------------------------------------------
create table public.trainer_subscription (
  trainer_id uuid primary key references public.profiles(id) on delete cascade,
  plan_key text not null references public.plans(key),
  extra_client_blocks int not null default 0 check (extra_client_blocks >= 0),
  extra_seats int not null default 0 check (extra_seats >= 0),
  ai_extra_packs int not null default 0 check (ai_extra_packs >= 0),
  -- Se fija al bajar de plan (o de bloques) quedando por encima del límite:
  -- el entrenador tiene hasta esta fecha para ajustar antes de que la cuenta
  -- pase a "acción requerida". Se limpia sola en cuanto vuelve a estar dentro.
  over_limit_grace_until timestamptz,
  updated_at timestamptz not null default now()
);

comment on table public.trainer_subscription is
  'Lo que cada entrenador tiene contratado por encima del mínimo de su plan: bloques de 5 clientes, seats (Gym) y paquetes de generaciones de IA. Mientras no haya Stripe, lo edita el superadmin.';

alter table public.trainer_subscription enable row level security;

create policy trainer_subscription_select_own on public.trainer_subscription
  for select to authenticated
  using (trainer_id = auth.uid() or public.current_user_role() = 'superadmin');

create policy trainer_subscription_write_superadmin on public.trainer_subscription
  for all to authenticated
  using (public.current_user_role() = 'superadmin')
  with check (public.current_user_role() = 'superadmin');

-- Una fila por cada entrenador que ya existe.
insert into public.trainer_subscription (trainer_id, plan_key)
select id, coalesce(subscription_plan, 'free')
from public.profiles
where role = 'trainer'
on conflict (trainer_id) do nothing;

-- Y una fila para cada entrenador nuevo (o cliente que se vuelve entrenador).
create or replace function public.ensure_trainer_subscription()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role = 'trainer' then
    insert into public.trainer_subscription (trainer_id, plan_key)
    values (new.id, coalesce(new.subscription_plan, 'free'))
    on conflict (trainer_id) do nothing;
  end if;
  return new;
end;
$$;

create trigger trg_ensure_trainer_subscription
  after insert or update of role on public.profiles
  for each row execute function public.ensure_trainer_subscription();

-- ----------------------------------------------------------------------------
-- 3. Límite efectivo + bloqueo
-- ----------------------------------------------------------------------------

-- Clientes que caben en el plan de este entrenador (null = ilimitado).
create or replace function public.trainer_client_limit(p_trainer_id uuid)
returns int
language sql
stable
security definer
set search_path = public
as $$
  select case
    when p.included_clients is null then null
    else p.included_clients + coalesce(ts.extra_client_blocks, 0) * coalesce(p.extra_block_size, 5)
  end
  from public.trainer_subscription ts
  join public.plans p on p.key = ts.plan_key
  where ts.trainer_id = p_trainer_id;
$$;

-- Clientes activos que tiene ahora mismo.
create or replace function public.trainer_active_client_count(p_trainer_id uuid)
returns int
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::int
  from public.profiles
  where trainer_id = p_trainer_id and role = 'client' and status = 'active';
$$;

-- ¿Puede sumar un cliente más? (true si no hay límite o si todavía hay cupo)
create or replace function public.trainer_can_add_client(p_trainer_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.trainer_client_limit(p_trainer_id) is null
      or public.trainer_active_client_count(p_trainer_id)
         < public.trainer_client_limit(p_trainer_id);
$$;

grant execute on function public.trainer_client_limit(uuid) to authenticated;
grant execute on function public.trainer_active_client_count(uuid) to authenticated;
grant execute on function public.trainer_can_add_client(uuid) to authenticated;

-- Ajusta la ventana de gracia: la abre (7 días) si el entrenador está por
-- encima del límite y no la tenía abierta; la cierra en cuanto vuelve a estar
-- dentro. Solo el propio entrenador o un superadmin la pueden disparar.
create or replace function public.refresh_over_limit_grace(p_trainer_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_limit int;
  v_count int;
  v_grace timestamptz;
begin
  if p_trainer_id <> auth.uid() and public.current_user_role() <> 'superadmin' then
    raise exception 'Sin permiso.' using errcode = '42501';
  end if;

  v_limit := public.trainer_client_limit(p_trainer_id);

  if v_limit is null then
    update public.trainer_subscription
    set over_limit_grace_until = null, updated_at = now()
    where trainer_id = p_trainer_id and over_limit_grace_until is not null;
    return;
  end if;

  v_count := public.trainer_active_client_count(p_trainer_id);
  select over_limit_grace_until into v_grace
  from public.trainer_subscription where trainer_id = p_trainer_id;

  if v_count > v_limit and v_grace is null then
    update public.trainer_subscription
    set over_limit_grace_until = now() + interval '7 days', updated_at = now()
    where trainer_id = p_trainer_id;
  elsif v_count <= v_limit and v_grace is not null then
    update public.trainer_subscription
    set over_limit_grace_until = null, updated_at = now()
    where trainer_id = p_trainer_id;
  end if;
end;
$$;

grant execute on function public.refresh_over_limit_grace(uuid) to authenticated;

-- ----------------------------------------------------------------------------
-- 4. Aplicar el bloqueo en los tres caminos por los que entra un cliente
-- ----------------------------------------------------------------------------

-- 4a. Crear invitación: la política de INSERT ahora exige que haya cupo.
drop policy if exists client_invitations_insert_own_as_trainer on public.client_invitations;
create policy client_invitations_insert_own_as_trainer on public.client_invitations
  for insert to authenticated
  with check (
    trainer_id = auth.uid()
    and current_user_role() = 'trainer'
    and public.trainer_can_add_client(auth.uid())
  );

-- 4b. Aceptar invitación: se revalida el cupo (por si el entrenador bajó de
-- plan entre que mandó el link y el cliente lo abrió). Solo cuenta como
-- cliente NUEVO si no era ya cliente activo de ese mismo entrenador.
create or replace function public.redeem_client_invitation(p_token uuid)
returns profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invitation public.client_invitations;
  v_profile public.profiles;
begin
  if auth.uid() is null then
    raise exception 'Debes iniciar sesion para aceptar la invitacion.'
      using errcode = '28000';
  end if;

  select * into v_invitation
  from public.client_invitations
  where token = p_token
  for update;

  if not found then
    raise exception 'Esta invitacion no existe.' using errcode = 'P0002';
  end if;

  if v_invitation.status <> 'pending' then
    raise exception 'Esta invitacion ya fue usada o fue cancelada.'
      using errcode = 'P0001';
  end if;

  select * into v_profile from public.profiles where id = auth.uid();

  if not found then
    raise exception 'Tu perfil todavia no esta listo. Intenta de nuevo.'
      using errcode = 'P0002';
  end if;

  if v_profile.trainer_id is not null
     and v_profile.trainer_id <> v_invitation.trainer_id then
    raise exception 'Ya perteneces al programa de otro entrenador.'
      using errcode = 'P0001';
  end if;

  -- Bloqueo por plan: solo si de verdad suma un cliente nuevo al conteo.
  if (v_profile.trainer_id is distinct from v_invitation.trainer_id
      or v_profile.status is distinct from 'active')
     and not public.trainer_can_add_client(v_invitation.trainer_id) then
    raise exception 'Tu entrenador llego al limite de clientes de su plan. Pidele que te invite de nuevo cuando tenga cupo.'
      using errcode = 'P0001';
  end if;

  update public.profiles
  set role = 'client',
      trainer_id = v_invitation.trainer_id,
      goal = coalesce(v_invitation.goal, goal),
      health_notes = coalesce(v_invitation.health_notes, health_notes),
      full_name = case
        when coalesce(full_name, '') = '' then coalesce(v_invitation.full_name, '')
        else full_name
      end,
      status = 'active'
  where id = auth.uid()
  returning * into v_profile;

  update public.client_invitations
  set status = 'accepted', accepted_at = now()
  where id = v_invitation.id;

  return v_profile;
end;
$$;

-- 4c. Reactivar cliente: un trigger BEFORE UPDATE en profiles frena que un
-- entrenador al tope reactive a un cliente inactivo (desde cualquier pantalla
-- — dashboard, lista de clientes, perfil). Además, cualquier cambio de estado
-- de un cliente refresca la ventana de gracia de su entrenador.
create or replace function public.enforce_client_limit_on_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role = 'client' and new.trainer_id is not null then
    -- Reactivación estando al tope: no se permite.
    if new.status = 'active' and old.status is distinct from 'active'
       and not public.trainer_can_add_client(new.trainer_id) then
      raise exception 'Llegaste al limite de clientes de tu plan. Sube de plan o desactiva a alguien antes de reactivar a otro.'
        using errcode = 'P0001';
    end if;
  end if;
  return new;
end;
$$;

create trigger trg_enforce_client_limit_on_status
  before update of status on public.profiles
  for each row execute function public.enforce_client_limit_on_status();

-- Después de que cambie el estado, recalcular la gracia del entrenador
-- (si desactivó lo suficiente para volver a estar dentro, se cierra sola).
create or replace function public.after_client_status_refresh_grace()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role = 'client' and new.trainer_id is not null
     and new.status is distinct from old.status then
    perform public.refresh_over_limit_grace(new.trainer_id);
  end if;
  return new;
end;
$$;

create trigger trg_after_client_status_refresh_grace
  after update of status on public.profiles
  for each row execute function public.after_client_status_refresh_grace();

-- ----------------------------------------------------------------------------
-- 5. superadmin_set_plan ahora también sincroniza trainer_subscription y
--    abre/cierra la ventana de gracia al cambiar el plan.
-- ----------------------------------------------------------------------------
create or replace function public.superadmin_set_plan(
  p_profile_id uuid,
  p_plan_key text,
  p_status text default 'active',
  p_is_free_grant boolean default false,
  p_expires_at timestamptz default null,
  p_note text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role public.user_role;
  v_prev_plan text;
  v_prev_status text;
begin
  if public.current_user_role() <> 'superadmin' then
    raise exception 'Solo el superadmin puede cambiar planes.';
  end if;

  select role, subscription_plan, subscription_status
    into v_role, v_prev_plan, v_prev_status
  from public.profiles
  where id = p_profile_id;

  if v_role is null then
    raise exception 'Perfil no encontrado.';
  end if;
  if v_role not in ('trainer', 'client') then
    raise exception 'Solo se puede asignar plan a entrenadores o clientes.';
  end if;
  if not exists (select 1 from public.plans where key = p_plan_key and is_active) then
    raise exception 'Plan inválido.';
  end if;
  if p_status not in ('active', 'trialing', 'past_due', 'canceled') then
    raise exception 'Estado de suscripción inválido.';
  end if;

  update public.profiles
  set subscription_plan = p_plan_key,
      subscription_status = p_status,
      plan_source = 'manual',
      plan_override_expires_at = p_expires_at,
      plan_granted_by = auth.uid(),
      plan_changed_at = now()
  where id = p_profile_id;

  insert into public.plan_change_log (
    profile_id, previous_plan, new_plan, previous_status, new_status,
    is_free_grant, expires_at, note, changed_by
  ) values (
    p_profile_id, v_prev_plan, p_plan_key, v_prev_status, p_status,
    p_is_free_grant, p_expires_at, p_note, auth.uid()
  );

  -- Los entrenadores tienen fila en trainer_subscription; al cambiarles el
  -- plan se sincroniza el plan_key y se recalcula la ventana de gracia (si
  -- bajaron de plan y quedan sobre el límite, arranca la semana).
  if v_role = 'trainer' then
    insert into public.trainer_subscription (trainer_id, plan_key)
    values (p_profile_id, p_plan_key)
    on conflict (trainer_id) do update
      set plan_key = excluded.plan_key, updated_at = now();

    perform public.refresh_over_limit_grace(p_profile_id);
  end if;
end;
$$;
