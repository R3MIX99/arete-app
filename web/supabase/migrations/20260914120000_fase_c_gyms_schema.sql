-- Fase C del roadmap de Gym (ver memoria "gym-plan-roadmap" / artefacto
-- "Plan técnico: cobros y equipos Gym"): el gimnasio como organización.
--
-- Esquema mínimo para que exista un "gimnasio" con dueño y miembros. La
-- refactorización de RLS de datos de clientes para que admin/supervisor
-- vean a todo el equipo (Fase D), las invitaciones de empleados por
-- correo (Fase E) y los paneles de administrador/supervisor (Fase F)
-- son fases aparte — aquí solo se sienta la base de datos y el único
-- camino de alta que ya se puede construir sin Stripe: el superadmin
-- crea el gimnasio a mano para un entrenador que ya existe en la
-- plataforma (decisión aprobada #1 — el alta automática al pagar con
-- Stripe es Fase H).

-- ----------------------------------------------------------------------------
-- 1. Tipos y tablas
-- ----------------------------------------------------------------------------

create type public.gym_role as enum ('admin', 'supervisor', 'trainer', 'nutritionist', 'assistant');

create table public.gyms (
  id uuid primary key default gen_random_uuid(),
  -- Quien contrató el plan Gym — no necesariamente sigue siendo el único
  -- admin (puede haber varios en gym_members), pero es la referencia
  -- estable de "de quién es este gimnasio".
  owner_id uuid not null references public.profiles(id),
  name text not null,
  created_at timestamptz not null default now()
);

comment on table public.gyms is
  'Un gimnasio del plan Gym: un equipo de entrenadores/nutriólogos que comparte una bolsa de clientes. Se crea a mano desde /superadmin/gimnasios mientras no exista el alta automática por Stripe (Fase H).';

create table public.gym_members (
  gym_id uuid not null references public.gyms(id) on delete cascade,
  -- Los empleados son profiles con role='trainer' (para no tocar el enum
  -- user_role ni current_user_role()) — su rol dentro del gimnasio vive
  -- aquí, no en profiles.role. El administrador también es role='trainer'
  -- + gym_members.role='admin'.
  profile_id uuid not null references public.profiles(id) on delete cascade,
  role public.gym_role not null,
  status text not null default 'active' check (status in ('active', 'invited', 'removed')),
  invited_by uuid references public.profiles(id),
  joined_at timestamptz,
  created_at timestamptz not null default now(),
  primary key (gym_id, profile_id)
);

comment on table public.gym_members is
  'Quién pertenece a qué gimnasio y con qué rol (gym_role). Un profile puede pertenecer a varios gimnasios, aunque en la práctica es raro. Las invitaciones por correo (Fase E) insertan aquí vía redeem_gym_invitation(); por ahora, mientras no exista esa función, solo el superadmin escribe en esta tabla.';

create index gym_members_profile_id_idx on public.gym_members (profile_id);

-- El cliente pertenece a la bolsa del gimnasio, además de a su entrenador
-- asignado (trainer_id, que puede quedar en null mientras nadie lo toma
-- — ver Fase D). El propio empleado también queda con gym_id puesto, para
-- saber "a qué gimnasio pertenezco" sin tener que consultar gym_members.
alter table public.profiles add column gym_id uuid references public.gyms(id);
create index profiles_gym_id_idx on public.profiles (gym_id) where gym_id is not null;

-- ----------------------------------------------------------------------------
-- 2. Helper de permisos (evita política recursiva en gym_members)
-- ----------------------------------------------------------------------------

create or replace function public.is_gym_manager(p_gym_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.gym_members
    where gym_id = p_gym_id
      and profile_id = auth.uid()
      and status = 'active'
      and role in ('admin', 'supervisor')
  );
$$;

comment on function public.is_gym_manager is
  'True si el usuario actual es admin o supervisor activo de ese gimnasio. SECURITY DEFINER a propósito: lo usan las policies de gyms/gym_members y, al ser función aparte, no genera recursión de RLS sobre la propia tabla.';

grant execute on function public.is_gym_manager(uuid) to authenticated;

-- ----------------------------------------------------------------------------
-- 3. RLS
-- ----------------------------------------------------------------------------

alter table public.gyms enable row level security;

create policy gyms_select on public.gyms
  for select to authenticated
  using (
    public.current_user_role() = 'superadmin'
    or exists (
      select 1 from public.gym_members
      where gym_id = gyms.id and profile_id = auth.uid() and status = 'active'
    )
  );

-- Solo el superadmin da de alta gimnasios por ahora (el alta automática
-- por Stripe, Fase H, insertará vía una función SECURITY DEFINER que no
-- depende de esta policy).
create policy gyms_insert_superadmin on public.gyms
  for insert to authenticated
  with check (public.current_user_role() = 'superadmin');

-- El nombre del gimnasio (y a futuro branding) lo puede tocar su propio
-- admin, no solo el superadmin — es lo único de "Facturación/ajustes del
-- gimnasio" (Fase F) que tiene sentido dejar ya sin esperar esa fase.
create policy gyms_update on public.gyms
  for update to authenticated
  using (public.current_user_role() = 'superadmin' or public.is_gym_manager(id))
  with check (public.current_user_role() = 'superadmin' or public.is_gym_manager(id));

create policy gyms_delete_superadmin on public.gyms
  for delete to authenticated
  using (public.current_user_role() = 'superadmin');

alter table public.gym_members enable row level security;

create policy gym_members_select on public.gym_members
  for select to authenticated
  using (
    profile_id = auth.uid()
    or public.current_user_role() = 'superadmin'
    or public.is_gym_manager(gym_id)
  );

-- Escritura solo superadmin por ahora — Fase E agrega el camino de
-- autoservicio (redeem_gym_invitation, admin invita/quita empleados),
-- todo vía funciones SECURITY DEFINER que no dependen de esta policy.
create policy gym_members_write_superadmin on public.gym_members
  for all to authenticated
  using (public.current_user_role() = 'superadmin')
  with check (public.current_user_role() = 'superadmin');

-- ----------------------------------------------------------------------------
-- 4. Alta manual del gimnasio (único camino de alta hasta Fase H)
-- ----------------------------------------------------------------------------

create or replace function public.superadmin_create_gym(p_owner_id uuid, p_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_gym_id uuid;
  v_role public.user_role;
  v_name text := trim(coalesce(p_name, ''));
begin
  if public.current_user_role() <> 'superadmin' then
    raise exception 'Solo el superadmin puede crear gimnasios.' using errcode = '42501';
  end if;

  if v_name = '' then
    raise exception 'El gimnasio necesita un nombre.' using errcode = 'P0001';
  end if;

  select role into v_role from public.profiles where id = p_owner_id;
  if v_role is null then
    raise exception 'El entrenador dueño no existe.' using errcode = 'P0002';
  end if;
  -- El alta manual solo acepta un entrenador ya existente en la
  -- plataforma como dueño — invitar a un dueño que todavía no tiene
  -- cuenta es el flujo de gym_invitations de la Fase E, no esta función.
  if v_role <> 'trainer' then
    raise exception 'El dueño del gimnasio tiene que ser un entrenador.' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.gyms where owner_id = p_owner_id) then
    raise exception 'Este entrenador ya es dueño de un gimnasio.' using errcode = 'P0001';
  end if;

  insert into public.gyms (owner_id, name) values (p_owner_id, v_name)
  returning id into v_gym_id;

  insert into public.gym_members (gym_id, profile_id, role, status, invited_by, joined_at)
  values (v_gym_id, p_owner_id, 'admin', 'active', auth.uid(), now());

  update public.profiles set gym_id = v_gym_id where id = p_owner_id;

  -- El plan Gym es el único con seats de equipo — si el dueño no lo
  -- tenía ya, se lo asigna en el mismo movimiento (mismo camino que usa
  -- el resto de cambios de plan manuales, así queda en plan_change_log).
  perform public.superadmin_set_plan(
    p_owner_id, 'gym', 'active', false, null,
    'Plan asignado automáticamente al crear el gimnasio "' || v_name || '".'
  );

  return v_gym_id;
end;
$$;

comment on function public.superadmin_create_gym is
  'Único camino de alta de un gimnasio hasta que exista Stripe (Fase H): crea la fila en gyms, mete al dueño como admin en gym_members, le pone gym_id en su profile, y le asigna el plan Gym. El dueño tiene que ser un entrenador ya registrado.';

grant execute on function public.superadmin_create_gym(uuid, text) to authenticated;
