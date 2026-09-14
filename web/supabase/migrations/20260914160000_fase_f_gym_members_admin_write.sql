-- Fase F: el admin del propio gimnasio necesita poder cambiar roles y
-- quitar empleados desde su panel (matriz D3 — "Invitar/quitar
-- empleados, cambiar roles": solo admin, no supervisor). Hasta ahora
-- gym_members_write_superadmin dejaba esto exclusivamente al
-- superadmin — necesario mientras solo existía la herramienta de
-- superadmin (Fase E), ya no una vez que el propio admin tiene panel.
--
-- Nota: esto no valida cupo de seats en el insert (a diferencia de
-- gym_invitations) porque el alta de un empleado nuevo sigue pasando
-- por gym_invitations + redeem_gym_invitation(), que sí lo valida; un
-- insert directo a gym_members por un admin no es un flujo que exponga
-- ninguna pantalla todavía.

create or replace function public.is_gym_admin(p_gym_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.gym_members
    where gym_id = p_gym_id and profile_id = auth.uid() and status = 'active' and role = 'admin'
  );
$$;

comment on function public.is_gym_admin is
  'True si el usuario actual es admin activo de ese gimnasio (a diferencia de is_gym_manager, no incluye supervisor — cambiar roles/quitar gente es admin-only, matriz D3).';

grant execute on function public.is_gym_admin(uuid) to authenticated;

drop policy if exists gym_members_write_superadmin on public.gym_members;
create policy gym_members_write_superadmin on public.gym_members
  for all to authenticated
  using (public.current_user_role() = 'superadmin' or public.is_gym_admin(gym_id))
  with check (public.current_user_role() = 'superadmin' or public.is_gym_admin(gym_id));
