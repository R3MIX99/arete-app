-- Fase D del roadmap de Gym: refactor de RLS para que un gimnasio
-- funcione como organización, no solo como una etiqueta. Hasta ahora
-- TODA política de "¿quién ve/edita a este cliente o este contenido?"
-- se basaba únicamente en profiles.trainer_id = auth.uid() — un
-- entrenador solo veía lo suyo, sin importar si pertenecía a un
-- gimnasio con más gente. Esta migración agrega el "...o soy admin/
-- supervisor del gimnasio de este cliente" / "...o comparto biblioteca
-- de gimnasio con quien creó este contenido" a las políticas listadas
-- en la Fase D del artefacto "Plan técnico: cobros y equipos Gym".
--
-- No crea todavía ninguna pantalla nueva (eso es Fase F) ni el flujo de
-- invitación de empleados (Fase E) — es exclusivamente la base de
-- permisos para que, cuando esas fases lleguen, ya funcionen bien.

-- ----------------------------------------------------------------------------
-- 1. Funciones helper (D1)
-- ----------------------------------------------------------------------------

-- ¿El usuario actual puede ver y gestionar a este cliente? Por relación
-- directa (es su entrenador) o porque es admin/supervisor activo del
-- gimnasio al que pertenece el cliente.
create or replace function public.can_manage_client(p_client_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    exists (
      select 1 from public.profiles c
      where c.id = p_client_id and c.trainer_id = auth.uid()
    )
    or exists (
      select 1 from public.profiles c
      where c.id = p_client_id
        and c.gym_id is not null
        and public.is_gym_manager(c.gym_id)
    );
$$;

comment on function public.can_manage_client is
  'Fase D: true si el usuario actual es el entrenador directo de este cliente, o admin/supervisor activo del gimnasio del cliente. Reemplaza el chequeo "trainer_id = auth.uid()" en las políticas de datos de clientes.';

grant execute on function public.can_manage_client(uuid) to authenticated;

-- ¿Puede el usuario actual VER contenido (rutina/programa/plan
-- nutricional/ejercicio) creado por p_owner_trainer_id? Lo propio,
-- siempre; lo de un compañero de equipo, si ambos pertenecen al mismo
-- gimnasio (biblioteca compartida por gimnasio — decisión aprobada #5).
create or replace function public.can_view_gym_content(p_owner_trainer_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    p_owner_trainer_id = auth.uid()
    or exists (
      select 1
      from public.gym_members me
      join public.gym_members owner on owner.gym_id = me.gym_id
      where me.profile_id = auth.uid() and me.status = 'active'
        and owner.profile_id = p_owner_trainer_id and owner.status = 'active'
    );
$$;

comment on function public.can_view_gym_content is
  'Fase D: true si p_owner_trainer_id es el propio usuario, o un compañero activo del mismo gimnasio (cualquier rol — la biblioteca se ve completa, decisión #4/#5).';

grant execute on function public.can_view_gym_content(uuid) to authenticated;

-- ¿Puede el usuario actual EDITAR (no solo ver) contenido creado por
-- p_owner_trainer_id? Lo propio, siempre; lo de un compañero, solo si
-- su rol en el gimnasio puede alimentar la biblioteca — admin,
-- entrenador o nutriólogo (decisión #6: el nutriólogo edita rutinas
-- igual que el entrenador). Supervisor y asistente quedan fuera:
-- supervisor gestiona personas, no contenido; asistente es de solo
-- lectura en todo (decisión #4).
create or replace function public.can_edit_gym_content(p_owner_trainer_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    p_owner_trainer_id = auth.uid()
    or exists (
      select 1
      from public.gym_members me
      join public.gym_members owner on owner.gym_id = me.gym_id
      where me.profile_id = auth.uid() and me.status = 'active'
        and me.role in ('admin', 'trainer', 'nutritionist')
        and owner.profile_id = p_owner_trainer_id and owner.status = 'active'
    );
$$;

comment on function public.can_edit_gym_content is
  'Fase D: true si p_owner_trainer_id es el propio usuario, o un compañero activo del mismo gimnasio cuyo rol (admin/entrenador/nutriólogo) puede alimentar la biblioteca compartida.';

grant execute on function public.can_edit_gym_content(uuid) to authenticated;

-- ----------------------------------------------------------------------------
-- 2. profiles (D2)
-- ----------------------------------------------------------------------------

drop policy if exists profiles_select_trainer_sees_clients on public.profiles;
create policy profiles_select_trainer_sees_clients on public.profiles
  for select to authenticated
  using (public.can_manage_client(id));

-- La actualización de un cliente (incluido reasignarlo a otro empleado,
-- cambiando trainer_id) sigue permitida a su entrenador directo; admin/
-- supervisor además pueden reasignarlo a cualquier compañero activo del
-- mismo gimnasio. Un entrenador normal no puede "regalar" su cliente a
-- otro por su cuenta — eso es acción de admin/supervisor (matriz D3).
drop policy if exists profiles_update_trainer_manages_clients on public.profiles;
create policy profiles_update_trainer_manages_clients on public.profiles
  for update to authenticated
  using (public.can_manage_client(id) and current_user_role() = 'trainer')
  with check (
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
  );

-- ----------------------------------------------------------------------------
-- 3. client_assignments (D2) — select/insert/delete
-- ----------------------------------------------------------------------------

drop policy if exists client_assignments_select_own_as_trainer on public.client_assignments;
create policy client_assignments_select_own_as_trainer on public.client_assignments
  for select to authenticated
  using (public.can_manage_client(client_id));

drop policy if exists client_assignments_delete_own on public.client_assignments;
create policy client_assignments_delete_own on public.client_assignments
  for delete to authenticated
  using (public.can_manage_client(client_id));

drop policy if exists client_assignments_insert_own_as_trainer on public.client_assignments;
create policy client_assignments_insert_own_as_trainer on public.client_assignments
  for insert to authenticated
  with check (
    current_user_role() = 'trainer'
    and public.can_manage_client(client_id)
    -- El registro queda a nombre de quien de verdad va a atender al
    -- cliente: uno mismo, o —si quien asigna es admin/supervisor—
    -- cualquier compañero activo del mismo gimnasio del cliente.
    and (
      trainer_id = auth.uid()
      or exists (
        select 1 from public.profiles c
        join public.gym_members gm on gm.gym_id = c.gym_id
        where c.id = client_assignments.client_id
          and gm.profile_id = client_assignments.trainer_id
          and gm.status = 'active'
      )
    )
    and (program_id is null or public.can_view_gym_content((select p.trainer_id from public.programs p where p.id = program_id)))
    and (routine_id is null or public.can_view_gym_content((select r.trainer_id from public.routines r where r.id = routine_id)))
  );

-- ----------------------------------------------------------------------------
-- 4. assignment_overrides (D2) — vía la asignación
-- ----------------------------------------------------------------------------

drop policy if exists assignment_overrides_select_own_as_trainer on public.assignment_overrides;
create policy assignment_overrides_select_own_as_trainer on public.assignment_overrides
  for select to authenticated
  using (
    exists (
      select 1 from public.client_assignments ca
      where ca.id = assignment_overrides.assignment_id and public.can_manage_client(ca.client_id)
    )
  );

drop policy if exists assignment_overrides_insert_own on public.assignment_overrides;
create policy assignment_overrides_insert_own on public.assignment_overrides
  for insert to authenticated
  with check (
    exists (
      select 1 from public.client_assignments ca
      where ca.id = assignment_overrides.assignment_id and public.can_manage_client(ca.client_id)
    )
    and exists (
      select 1 from public.routines r
      where r.id = assignment_overrides.routine_id and public.can_view_gym_content(r.trainer_id)
    )
  );

drop policy if exists assignment_overrides_update_own on public.assignment_overrides;
create policy assignment_overrides_update_own on public.assignment_overrides
  for update to authenticated
  using (
    exists (
      select 1 from public.client_assignments ca
      where ca.id = assignment_overrides.assignment_id and public.can_manage_client(ca.client_id)
    )
  )
  with check (
    exists (
      select 1 from public.client_assignments ca
      where ca.id = assignment_overrides.assignment_id and public.can_manage_client(ca.client_id)
    )
    and exists (
      select 1 from public.routines r
      where r.id = assignment_overrides.routine_id and public.can_view_gym_content(r.trainer_id)
    )
  );

drop policy if exists assignment_overrides_delete_own on public.assignment_overrides;
create policy assignment_overrides_delete_own on public.assignment_overrides
  for delete to authenticated
  using (
    exists (
      select 1 from public.client_assignments ca
      where ca.id = assignment_overrides.assignment_id and public.can_manage_client(ca.client_id)
    )
  );

-- ----------------------------------------------------------------------------
-- 5. client_sessions / client_set_logs (D2) — vista de gimnasio
-- ----------------------------------------------------------------------------

drop policy if exists client_sessions_select_trainer_sees_clients on public.client_sessions;
create policy client_sessions_select_trainer_sees_clients on public.client_sessions
  for select to authenticated
  using (public.can_manage_client(client_id));

drop policy if exists client_set_logs_select_trainer_sees_clients on public.client_set_logs;
create policy client_set_logs_select_trainer_sees_clients on public.client_set_logs
  for select to authenticated
  using (public.can_manage_client(client_id));

-- ----------------------------------------------------------------------------
-- 6. progress_measurements / progress_entries (D2) — vista + alta de gimnasio
-- ----------------------------------------------------------------------------

drop policy if exists progress_measurements_select_own_as_trainer on public.progress_measurements;
create policy progress_measurements_select_own_as_trainer on public.progress_measurements
  for select to authenticated
  using (public.can_manage_client(client_id));

drop policy if exists progress_measurements_insert_own_as_trainer on public.progress_measurements;
create policy progress_measurements_insert_own_as_trainer on public.progress_measurements
  for insert to authenticated
  with check (
    trainer_id = auth.uid()
    and current_user_role() = 'trainer'
    and public.can_manage_client(client_id)
  );

drop policy if exists progress_entries_select_own_as_trainer on public.progress_entries;
create policy progress_entries_select_own_as_trainer on public.progress_entries
  for select to authenticated
  using (public.can_manage_client(client_id));

drop policy if exists progress_entries_insert_own_as_trainer on public.progress_entries;
create policy progress_entries_insert_own_as_trainer on public.progress_entries
  for insert to authenticated
  with check (
    trainer_id = auth.uid()
    and current_user_role() = 'trainer'
    and public.can_manage_client(client_id)
  );

-- update/delete de measurements y entries se quedan como estaban (solo
-- quien las escribió las edita/borra) — el roadmap no pide extender la
-- edición de notas ajenas a admin/supervisor, solo verlas y poder
-- agregar las propias para cualquier cliente del gimnasio.

-- ----------------------------------------------------------------------------
-- 7. diet_plan_assignments (D2) — igual que client_assignments
-- ----------------------------------------------------------------------------

drop policy if exists diet_plan_assignments_select_own_as_trainer on public.diet_plan_assignments;
create policy diet_plan_assignments_select_own_as_trainer on public.diet_plan_assignments
  for select to authenticated
  using (public.can_manage_client(client_id));

drop policy if exists diet_plan_assignments_delete_own on public.diet_plan_assignments;
create policy diet_plan_assignments_delete_own on public.diet_plan_assignments
  for delete to authenticated
  using (public.can_manage_client(client_id));

drop policy if exists diet_plan_assignments_insert_own_as_trainer on public.diet_plan_assignments;
create policy diet_plan_assignments_insert_own_as_trainer on public.diet_plan_assignments
  for insert to authenticated
  with check (
    current_user_role() = 'trainer'
    and public.can_manage_client(client_id)
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

-- ----------------------------------------------------------------------------
-- 8. Biblioteca compartida: routines / programs / diet_plans (D2, decisión #5)
-- ----------------------------------------------------------------------------
-- exercises no se toca en el select: ya tiene exercises_select_all_trainers
-- (cualquier entrenador ve el catálogo completo, es una comunidad global,
-- no por gimnasio) — solo se extiende quién puede editar/borrar.

drop policy if exists routines_select_own on public.routines;
create policy routines_select_own on public.routines
  for select to authenticated
  using (public.can_view_gym_content(trainer_id));

drop policy if exists routines_update_own on public.routines;
create policy routines_update_own on public.routines
  for update to authenticated
  using (public.can_edit_gym_content(trainer_id))
  with check (public.can_edit_gym_content(trainer_id));

drop policy if exists routines_delete_own on public.routines;
create policy routines_delete_own on public.routines
  for delete to authenticated
  using (public.can_edit_gym_content(trainer_id));

drop policy if exists programs_select_own on public.programs;
create policy programs_select_own on public.programs
  for select to authenticated
  using (public.can_view_gym_content(trainer_id));

drop policy if exists programs_update_own on public.programs;
create policy programs_update_own on public.programs
  for update to authenticated
  using (public.can_edit_gym_content(trainer_id))
  with check (public.can_edit_gym_content(trainer_id));

drop policy if exists programs_delete_own on public.programs;
create policy programs_delete_own on public.programs
  for delete to authenticated
  using (public.can_edit_gym_content(trainer_id));

drop policy if exists diet_plans_select_own on public.diet_plans;
create policy diet_plans_select_own on public.diet_plans
  for select to authenticated
  using (public.can_view_gym_content(trainer_id));

drop policy if exists diet_plans_update_own on public.diet_plans;
create policy diet_plans_update_own on public.diet_plans
  for update to authenticated
  using (public.can_edit_gym_content(trainer_id))
  with check (public.can_edit_gym_content(trainer_id));

drop policy if exists diet_plans_delete_own on public.diet_plans;
create policy diet_plans_delete_own on public.diet_plans
  for delete to authenticated
  using (public.can_edit_gym_content(trainer_id));

drop policy if exists exercises_update_own on public.exercises;
create policy exercises_update_own on public.exercises
  for update to authenticated
  using (public.can_edit_gym_content(trainer_id))
  with check (public.can_edit_gym_content(trainer_id));

drop policy if exists exercises_delete_own on public.exercises;
create policy exercises_delete_own on public.exercises
  for delete to authenticated
  using (public.can_edit_gym_content(trainer_id));

-- ----------------------------------------------------------------------------
-- Nota: client_notifications se deja sin tocar a propósito (el roadmap la
-- marca "opcional para admin" — es el buzón propio del cliente, no hay un
-- caso de uso claro todavía para que el admin lo lea). gyms/gym_members ya
-- tienen su RLS desde la Fase C.
-- ----------------------------------------------------------------------------
