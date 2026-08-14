-- Permite ver los datos básicos de UNA invitación dado su token exacto,
-- sin necesidad de sesión y sin exponer el resto de invitaciones (la
-- política RLS de client_invitations solo deja ver al propio
-- entrenador). SECURITY DEFINER + solo columnas no sensibles.
create or replace function public.get_invitation_preview(p_token uuid)
returns table (
  id uuid,
  email text,
  full_name text,
  goal client_goal,
  status text,
  trainer_name text,
  business_name text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
    select
      ci.id,
      ci.email,
      ci.full_name,
      ci.goal,
      ci.status,
      coalesce(p.full_name, 'tu entrenador') as trainer_name,
      p.business_name
    from public.client_invitations ci
    join public.profiles p on p.id = ci.trainer_id
    where ci.token = p_token;
end;
$$;

grant execute on function public.get_invitation_preview(uuid) to anon, authenticated;
