-- Fase E del roadmap de Gym: invitaciones de empleados por correo. Mismo
-- patrón que client_invitations (E2 del artefacto "Plan técnico: cobros
-- y equipos Gym"): una fila con token público, una función de preview sin
-- sesión, y un candado de correo al canjear — igual al que ya se construyó
-- y probó en Fase B para las invitaciones de cliente.
--
-- El alta del primer admin/dueño de un gimnasio sigue siendo
-- superadmin_create_gym() (Fase C) — esta tabla es para que ESE admin (o
-- el superadmin, mientras no exista el panel de administrador de la Fase
-- F) invite al resto del equipo a un gimnasio que ya existe.

-- ----------------------------------------------------------------------------
-- 1. Tabla
-- ----------------------------------------------------------------------------

create table public.gym_invitations (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms(id) on delete cascade,
  token uuid not null default gen_random_uuid() unique,
  email text not null,
  invited_role public.gym_role not null,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'expired', 'revoked')),
  invited_by uuid not null references public.profiles(id),
  expires_at timestamptz not null default now() + interval '14 days',
  created_at timestamptz not null default now(),
  accepted_at timestamptz
);

comment on table public.gym_invitations is
  'Invitaciones de empleado a un gimnasio (Fase E). Mismo patrón que client_invitations: token público, get_gym_invitation_preview() para verla sin sesión, redeem_gym_invitation() para aceptarla con el candado de correo (decisión #3).';

create index gym_invitations_gym_id_idx on public.gym_invitations (gym_id);
create index gym_invitations_email_idx on public.gym_invitations (lower(email));

-- ----------------------------------------------------------------------------
-- 2. Cupo de seats (mismo patrón que trainer_client_limit/trainer_active_client_count de Fase A)
-- ----------------------------------------------------------------------------

create or replace function public.gym_seat_limit(p_gym_id uuid)
returns int
language sql
stable
security definer
set search_path = public
as $$
  select p.included_seats + coalesce(ts.extra_seats, 0)
  from public.gyms g
  join public.trainer_subscription ts on ts.trainer_id = g.owner_id
  join public.plans p on p.key = ts.plan_key
  where g.id = p_gym_id;
$$;

comment on function public.gym_seat_limit is
  'Cuántos empleados caben en este gimnasio: included_seats del plan del dueño + extra_seats contratados.';

-- Cuenta miembros activos + invitaciones pendientes sin expirar, para no
-- dejar invitar de más aunque nadie haya aceptado todavía.
create or replace function public.gym_used_seats(p_gym_id uuid)
returns int
language sql
stable
security definer
set search_path = public
as $$
  select
    (select count(*)::int from public.gym_members where gym_id = p_gym_id and status = 'active')
    + (select count(*)::int from public.gym_invitations
        where gym_id = p_gym_id and status = 'pending' and expires_at > now());
$$;

grant execute on function public.gym_seat_limit(uuid) to authenticated;
grant execute on function public.gym_used_seats(uuid) to authenticated;

-- ----------------------------------------------------------------------------
-- 3. RLS
-- ----------------------------------------------------------------------------

alter table public.gym_invitations enable row level security;

create policy gym_invitations_select on public.gym_invitations
  for select to authenticated
  using (
    public.current_user_role() = 'superadmin'
    or public.is_gym_manager(gym_id)
    or invited_by = auth.uid()
  );

-- La validación de cupo va directo en el WITH CHECK (mismo patrón que
-- client_invitations_insert_own_as_trainer con trainer_can_add_client).
create policy gym_invitations_insert_manager on public.gym_invitations
  for insert to authenticated
  with check (
    invited_by = auth.uid()
    and (public.current_user_role() = 'superadmin' or public.is_gym_manager(gym_id))
    and public.gym_used_seats(gym_id) < public.gym_seat_limit(gym_id)
  );

-- Para revocar una invitación (poner status='revoked') — el admin del
-- gimnasio o el superadmin, directo por UPDATE, sin necesidad de RPC.
create policy gym_invitations_update_manager on public.gym_invitations
  for update to authenticated
  using (public.current_user_role() = 'superadmin' or public.is_gym_manager(gym_id))
  with check (public.current_user_role() = 'superadmin' or public.is_gym_manager(gym_id));

-- ----------------------------------------------------------------------------
-- 4. Preview pública (sin sesión) y canje
-- ----------------------------------------------------------------------------

create or replace function public.get_gym_invitation_preview(p_token uuid)
returns table (
  id uuid,
  email text,
  invited_role public.gym_role,
  status text,
  gym_name text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
    select gi.id, gi.email, gi.invited_role, gi.status, g.name as gym_name
    from public.gym_invitations gi
    join public.gyms g on g.id = gi.gym_id
    where gi.token = p_token;
end;
$$;

grant execute on function public.get_gym_invitation_preview(uuid) to anon, authenticated;

create or replace function public.redeem_gym_invitation(p_token uuid)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invitation public.gym_invitations;
  v_profile public.profiles;
begin
  if auth.uid() is null then
    raise exception 'Debes iniciar sesion para aceptar la invitacion.' using errcode = '28000';
  end if;

  select * into v_invitation from public.gym_invitations where token = p_token for update;

  if not found then
    raise exception 'Esta invitacion no existe.' using errcode = 'P0002';
  end if;

  if v_invitation.expires_at < now() and v_invitation.status = 'pending' then
    update public.gym_invitations set status = 'expired' where id = v_invitation.id;
    v_invitation.status := 'expired';
  end if;

  if v_invitation.status <> 'pending' then
    raise exception 'Esta invitacion ya fue usada, revocada o expiro.' using errcode = 'P0001';
  end if;

  select * into v_profile from public.profiles where id = auth.uid();
  if not found then
    raise exception 'Tu perfil todavia no esta listo. Intenta de nuevo.' using errcode = 'P0002';
  end if;

  -- Mismo candado que client_invitations (decision aprobada #3): el
  -- correo con el que te autenticas tiene que ser exactamente el de la
  -- invitacion — es la unica forma de verificar que de verdad eres tu.
  if lower(v_profile.email) is distinct from lower(v_invitation.email) then
    raise exception 'Esta invitacion es para %. Entraste con otra cuenta (%) — cierra sesion y vuelve a entrar con el correo correcto.',
      v_invitation.email, v_profile.email
      using errcode = 'P0001';
  end if;

  if exists (
    select 1 from public.gym_members
    where gym_id = v_invitation.gym_id and profile_id = auth.uid() and status = 'active'
  ) then
    raise exception 'Ya eres parte de este equipo.' using errcode = 'P0001';
  end if;

  if public.gym_used_seats(v_invitation.gym_id) - 1 >= public.gym_seat_limit(v_invitation.gym_id) then
    -- -1 porque esta misma invitacion pendiente ya se contaba en el cupo
    -- usado; si aun asi no cabe (p.ej. bajaron de plan mientras tanto).
    raise exception 'El gimnasio ya no tiene cupo de empleados disponible. Avisale a tu administrador.' using errcode = 'P0001';
  end if;

  insert into public.gym_members (gym_id, profile_id, role, status, invited_by, joined_at)
  values (v_invitation.gym_id, auth.uid(), v_invitation.invited_role, 'active', v_invitation.invited_by, now())
  on conflict (gym_id, profile_id) do update
    set role = excluded.role, status = 'active', joined_at = now();

  update public.profiles
  set role = case when role = 'client' then 'trainer' else role end,
      gym_id = v_invitation.gym_id
  where id = auth.uid()
  returning * into v_profile;

  update public.gym_invitations
  set status = 'accepted', accepted_at = now()
  where id = v_invitation.id;

  return v_profile;
end;
$$;

grant execute on function public.redeem_gym_invitation(uuid) to authenticated;
