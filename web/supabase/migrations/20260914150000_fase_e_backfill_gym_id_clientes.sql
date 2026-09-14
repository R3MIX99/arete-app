-- Corrección encontrada probando Fase C/D/E de punta a punta: un cliente
-- nunca heredaba profiles.gym_id de su entrenador — ni al crear el
-- gimnasio (superadmin_create_gym), ni al aceptar una invitación de
-- empleado (redeem_gym_invitation), ni al aceptar una invitación de
-- cliente nueva (redeem_client_invitation). Sin gym_id en el cliente,
-- can_manage_client() nunca encontraba el gimnasio y admin/supervisor no
-- podían verlo ni gestionarlo pese a que su entrenador sí era del equipo
-- — exactamente la "bolsa global de clientes" que pedía la Fase D (D4).

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

  -- Los clientes que el dueño ya atendía pasan a la bolsa del gimnasio.
  update public.profiles
  set gym_id = v_gym_id
  where trainer_id = p_owner_id and role = 'client';

  perform public.superadmin_set_plan(
    p_owner_id, 'gym', 'active', false, null,
    'Plan asignado automáticamente al crear el gimnasio "' || v_name || '".'
  );

  return v_gym_id;
end;
$$;

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

  -- Si este empleado ya atendía clientes por su cuenta (era entrenador
  -- independiente antes de unirse), esos clientes pasan a la bolsa del
  -- gimnasio también.
  update public.profiles
  set gym_id = v_invitation.gym_id
  where trainer_id = auth.uid() and role = 'client';

  update public.gym_invitations
  set status = 'accepted', accepted_at = now()
  where id = v_invitation.id;

  return v_profile;
end;
$$;

-- Cliente nuevo (invitación de cliente, Fase A/B): hereda el gym_id
-- vigente del entrenador en ese momento, si tiene uno.
create or replace function public.redeem_client_invitation(p_token uuid)
returns profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invitation public.client_invitations;
  v_profile public.profiles;
  v_trainer_gym_id uuid;
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

  if lower(v_profile.email) is distinct from lower(v_invitation.email) then
    raise exception 'Esta invitacion es para %. Entraste con otra cuenta (%) — cierra sesion y vuelve a entrar con el correo correcto.',
      v_invitation.email, v_profile.email
      using errcode = 'P0001';
  end if;

  if v_profile.trainer_id is not null
     and v_profile.trainer_id <> v_invitation.trainer_id then
    raise exception 'Ya perteneces al programa de otro entrenador.'
      using errcode = 'P0001';
  end if;

  if (v_profile.trainer_id is distinct from v_invitation.trainer_id
      or v_profile.status is distinct from 'active')
     and not public.trainer_can_add_client(v_invitation.trainer_id) then
    raise exception 'Tu entrenador llego al limite de clientes de su plan. Pidele que te invite de nuevo cuando tenga cupo.'
      using errcode = 'P0001';
  end if;

  select gym_id into v_trainer_gym_id from public.profiles where id = v_invitation.trainer_id;

  update public.profiles
  set role = 'client',
      trainer_id = v_invitation.trainer_id,
      gym_id = v_trainer_gym_id,
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

-- Backfill único: cualquier cliente cuyo entrenador ya tenga gym_id (por
-- ejemplo, si esta migración corre después de que ya existan gimnasios
-- creados a mano antes de este arreglo).
update public.profiles c
set gym_id = t.gym_id
from public.profiles t
where c.trainer_id = t.id
  and c.role = 'client'
  and c.gym_id is null
  and t.gym_id is not null;
