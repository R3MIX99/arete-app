-- Fase B (login con Google): con contraseña, el formulario de invitación
-- siempre usaba invitation.email para el signUp, así que de facto la cuenta
-- que canjeaba el token SIEMPRE era la invitada. Con "Continuar con
-- Google" eso ya no es cierto — Google deja elegir cualquier cuenta. Por
-- decisión del usuario (Fase E del roadmap, pero aplica desde ya): el
-- correo con el que se autentica tiene que ser el mismo de la invitación,
-- sin excepción — si no, nunca podría verificarlo y nunca sería el cliente
-- de ese entrenador.
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
