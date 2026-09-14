-- Nadie puede cambiarse su propio rol de gimnasio ni quitarse a sí mismo
-- del equipo (ni siquiera el admin) — evita que alguien se baje de admin
-- sin querer y se quede sin poder revertirlo, o se auto-elimine del
-- equipo por accidente. El panel ya oculta esos controles para uno
-- mismo (team-manager.tsx); este trigger es el candado real del lado
-- del servidor, por si alguien manda la petición directo. El superadmin
-- sigue pudiendo hacerlo (para corregir un gimnasio sin admin activo).

create or replace function public.prevent_gym_member_self_demotion()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.profile_id = auth.uid()
     and public.current_user_role() <> 'superadmin'
     and (new.role <> old.role or new.status <> old.status) then
    raise exception 'No puedes cambiar tu propio rol ni quitarte del equipo. Pidele a otro administrador que lo haga.'
      using errcode = 'P0001';
  end if;
  return new;
end;
$$;

comment on function public.prevent_gym_member_self_demotion is
  'Bloquea que un miembro del gimnasio cambie su propio rol o estado en gym_members — ni siquiera el admin. El superadmin queda exento para poder corregir un gimnasio sin admin activo.';

drop trigger if exists trg_prevent_gym_member_self_demotion on public.gym_members;
create trigger trg_prevent_gym_member_self_demotion
  before update on public.gym_members
  for each row execute function public.prevent_gym_member_self_demotion();
