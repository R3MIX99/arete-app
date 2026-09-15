-- Corrección de diseño encontrada probando Fase F: un cliente solo tenía
-- UN encargado (profiles.trainer_id) — asignarle un nutriólogo desde el
-- selector de "Clientes" REEMPLAZABA al entrenador, en vez de convivir
-- los dos. Un cliente de gimnasio necesita poder tener un entrenador
-- (dueño de sus rutinas) y un nutriólogo (dueño de su plan nutricional)
-- al mismo tiempo, cada uno viendo/editando solo su propio dominio — el
-- entrenador no toca la nutrición, el nutriólogo no toca las rutinas.

alter table public.profiles add column nutritionist_id uuid references public.profiles(id);
create index profiles_nutritionist_id_idx on public.profiles (nutritionist_id) where nutritionist_id is not null;

comment on column public.profiles.nutritionist_id is
  'Nutriólogo asignado a este cliente (rol de gimnasio) — independiente de trainer_id. Un cliente de gimnasio puede tener ambos a la vez; cada uno solo gestiona su propio dominio (rutinas vs. nutrición).';

-- ¿Puede el usuario actual gestionar la parte de NUTRICIÓN de este
-- cliente? El nutriólogo asignado, o el propio trainer_id si nunca se
-- asignó un nutriólogo aparte (compatibilidad con entrenadores
-- independientes, que siguen siendo dueños de todo el cliente), o
-- admin/supervisor del gimnasio.
create or replace function public.can_manage_client_nutrition(p_client_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    exists (
      select 1 from public.profiles c
      where c.id = p_client_id
        and (
          c.nutritionist_id = auth.uid()
          or (c.nutritionist_id is null and c.trainer_id = auth.uid())
        )
    )
    or exists (
      select 1 from public.profiles c
      where c.id = p_client_id
        and c.gym_id is not null
        and public.is_gym_manager(c.gym_id)
    );
$$;

comment on function public.can_manage_client_nutrition is
  'Fase F: análogo a can_manage_client() pero para el dominio de nutrición — usa nutritionist_id en vez de trainer_id (con fallback a trainer_id si el cliente nunca tuvo nutriólogo asignado aparte).';

grant execute on function public.can_manage_client_nutrition(uuid) to authenticated;

-- diet_plan_assignments ahora se gestiona por nutritionist_id, no por
-- trainer_id — antes usaba can_manage_client() (la de rutinas), que es
-- justo el bug: dejaba a CUALQUIER entrenador del cliente tocar su
-- nutrición sin importar quién fuera el nutriólogo de verdad.
drop policy if exists diet_plan_assignments_select_own_as_trainer on public.diet_plan_assignments;
create policy diet_plan_assignments_select_own_as_trainer on public.diet_plan_assignments
  for select to authenticated
  using (public.can_manage_client_nutrition(client_id));

drop policy if exists diet_plan_assignments_delete_own on public.diet_plan_assignments;
create policy diet_plan_assignments_delete_own on public.diet_plan_assignments
  for delete to authenticated
  using (public.can_manage_client_nutrition(client_id));

drop policy if exists diet_plan_assignments_insert_own_as_trainer on public.diet_plan_assignments;
create policy diet_plan_assignments_insert_own_as_trainer on public.diet_plan_assignments
  for insert to authenticated
  with check (
    current_user_role() = 'trainer'
    and public.can_manage_client_nutrition(client_id)
    and (
      trainer_id = auth.uid()
      or exists (
        select 1 from public.profiles c
        join public.gym_members gm on gm.gym_id = c.gym_id
        where c.id = diet_plan_assignments.client_id
          and gm.profile_id = diet_plan_assignments.trainer_id
          and gm.status = 'active'
      )
    )
    and exists (
      select 1 from public.diet_plans p
      where p.id = diet_plan_assignments.diet_plan_id and public.can_view_gym_content(p.trainer_id)
    )
  );

-- El cliente lo sigue viendo/gestionando su entrenador de rutinas O
-- admin/supervisor (sin cambios); se agrega que el nutriólogo asignado
-- también pueda VERLO (necesita ver al cliente para trabajar su
-- nutrición), aunque no sea su trainer_id ni admin/supervisor.
drop policy if exists profiles_select_trainer_sees_clients on public.profiles;
create policy profiles_select_trainer_sees_clients on public.profiles
  for select to authenticated
  using (public.can_manage_client(id) or nutritionist_id = auth.uid());

-- Reasignar: admin/supervisor pueden cambiar trainer_id Y/O
-- nutritionist_id a cualquier compañero activo del gimnasio con el rol
-- adecuado. Un entrenador o nutriólogo normal sigue sin poder
-- reasignarse a sí mismo ni a otro — eso es acción de admin/supervisor.
drop policy if exists profiles_update_trainer_manages_clients on public.profiles;
create policy profiles_update_trainer_manages_clients on public.profiles
  for update to authenticated
  using (public.can_manage_client(id) and current_user_role() = 'trainer')
  with check (
    (
      trainer_id = auth.uid()
      or (
        gym_id is not null
        and public.is_gym_manager(gym_id)
        and (
          trainer_id is null
          or exists (
            select 1 from public.gym_members gm
            where gm.gym_id = profiles.gym_id and gm.profile_id = profiles.trainer_id and gm.status = 'active'
          )
        )
      )
    )
    and (
      nutritionist_id is null
      or (
        gym_id is not null
        and (
          nutritionist_id = auth.uid()
          or (
            public.is_gym_manager(gym_id)
            and exists (
              select 1 from public.gym_members gm
              where gm.gym_id = profiles.gym_id and gm.profile_id = profiles.nutritionist_id and gm.status = 'active'
            )
          )
        )
      )
    )
  );
