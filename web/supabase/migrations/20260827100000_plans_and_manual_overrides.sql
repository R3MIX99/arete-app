-- Fase 13: catálogo de planes + control manual de suscripción por el
-- superadmin, con bitácora de cada cambio.

create table public.plans (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  name text not null,
  price_cents integer not null default 0 check (price_cents >= 0),
  currency text not null default 'MXN',
  client_limit integer check (client_limit is null or client_limit > 0),
  features text[] not null default '{}',
  is_active boolean not null default true,
  sort_order smallint not null default 0,
  created_at timestamptz not null default now()
);

comment on table public.plans is
  'Catálogo de planes de suscripción (para entrenadores). client_limit null = sin límite de clientes.';
comment on column public.plans.key is
  'Slug estable — es lo que se guarda en profiles.subscription_plan. No cambiar una vez usado.';

insert into public.plans (key, name, price_cents, currency, client_limit, features, sort_order) values
  ('free', 'Free', 0, 'MXN', 5, array['Hasta 5 clientes', 'Rutinas y planes nutricionales ilimitados'], 0),
  ('pro', 'Pro', 49900, 'MXN', 30, array['Hasta 30 clientes', 'Generación de rutinas con IA', 'Soporte prioritario'], 1),
  ('studio', 'Studio', 99900, 'MXN', null, array['Clientes ilimitados', 'Generación de rutinas con IA', 'Marca propia (logo y nombre de negocio)', 'Soporte prioritario'], 2);

alter table public.plans enable row level security;

create policy plans_select_authenticated on public.plans
  for select to authenticated using (true);

-- profiles.subscription_plan ya existía (texto libre) — se ata al
-- catálogo con un FK en vez de agregar una columna nueva. Además se
-- agregan los campos para saber SI el plan actual viene de un cambio
-- manual del superadmin (y por lo tanto debe pisar lo que diga Stripe
-- cuando se conecte en la Fase 15) o es el default del sistema.
alter table public.profiles
  add constraint profiles_subscription_plan_fkey
    foreign key (subscription_plan) references public.plans (key),
  add column plan_source text not null default 'default'
    check (plan_source in ('default', 'manual', 'stripe')),
  add column plan_override_expires_at timestamptz,
  add column plan_granted_by uuid references public.profiles (id),
  add column plan_changed_at timestamptz;

comment on column public.profiles.plan_source is
  'Quién decidió el plan actual: default (nunca lo tocaron), manual (lo cambió un superadmin), o stripe (lo puso el webhook de pagos, Fase 15).';
comment on column public.profiles.plan_override_expires_at is
  'Si plan_source = manual y esta fecha ya pasó, Stripe (Fase 15) puede volver a tomar el control del plan. Null = el cambio manual no expira solo.';
comment on column public.profiles.plan_granted_by is
  'Superadmin que hizo el último cambio manual de plan. Null si nunca se ha tocado a mano.';

create table public.plan_change_log (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  previous_plan text,
  new_plan text not null references public.plans (key),
  previous_status text,
  new_status text not null,
  is_free_grant boolean not null default false,
  expires_at timestamptz,
  note text,
  changed_by uuid not null references public.profiles (id),
  changed_at timestamptz not null default now()
);

comment on table public.plan_change_log is
  'Bitácora de cada cambio manual de plan hecho por un superadmin: qué tenía antes, qué le puso, y quién y cuándo.';

alter table public.plan_change_log enable row level security;

create policy plan_change_log_select_superadmin on public.plan_change_log
  for select to authenticated using (current_user_role() = 'superadmin');

-- Único camino para cambiar el plan de alguien a mano: valida el rol,
-- valida que el plan exista, actualiza profiles Y deja el registro en
-- la misma transacción — así nunca hay un cambio de plan sin bitácora.
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
end;
$$;

comment on function public.superadmin_set_plan is
  'Único camino soportado para que un superadmin cambie el plan de un entrenador o cliente a mano (incluyendo cortesías gratuitas). Revisa el rol, valida el plan, y deja bitácora en plan_change_log en la misma transacción.';

grant execute on function public.superadmin_set_plan(uuid, text, text, boolean, timestamptz, text) to authenticated;
