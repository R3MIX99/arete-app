-- Canje del enlace de invitacion.
--
-- Se implementa como RPC que el cliente llama DESPUES de crear su cuenta,
-- y no leyendo la metadata del registro, porque con inicio de sesion por
-- Google esa metadata la controla el proveedor y no hay forma confiable de
-- colar ahi el token. Asi el mismo camino sirve para correo y para Google.
--
-- El token es el secreto: quien tenga el enlace puede unirse al entrenador
-- que lo genero (igual que un enlace de invitacion de Slack o Notion). Por
-- eso es de un solo uso: al canjearse queda como 'accepted'.
create function public.redeem_client_invitation(p_token uuid)
returns public.profiles
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

  -- Cambiar de entrenador no es parte de este flujo: si ya tiene uno
  -- distinto, se corta con un mensaje claro en vez de reasignarlo en
  -- silencio y dejar al entrenador anterior sin saberlo.
  if v_profile.trainer_id is not null
     and v_profile.trainer_id <> v_invitation.trainer_id then
    raise exception 'Ya perteneces al programa de otro entrenador.'
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

comment on function public.redeem_client_invitation(uuid) is
  'Vincula al usuario autenticado con el entrenador que genero la invitacion. Funciona igual con registro por correo o por Google.';

-- Solo usuarios con sesion iniciada pueden canjear.
revoke execute on function public.redeem_client_invitation(uuid) from public, anon;
grant execute on function public.redeem_client_invitation(uuid) to authenticated;
