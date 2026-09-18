-- Corrección de modelo pedida tras probar con un gimnasio real: la
-- Fase D dejaba a CUALQUIER entrenador/nutriólogo del gimnasio EDITAR
-- las rutinas/programas/planes nutricionales de sus compañeros
-- (decisión #5 original: "biblioteca compartida, cualquier entrenador
-- la alimenta"). Eso ya no es lo que se quiere: cada quien es dueño de
-- lo suyo — lo crea privado por default, o lo comparte con el
-- gimnasio para que los demás lo VEAN y lo usen (asignárselo a sus
-- propios clientes), pero nunca lo EDITEN. El admin es la única
-- excepción: su contenido siempre es visible para todo el gimnasio
-- (es la "biblioteca oficial"), y el admin ve todo lo de su equipo,
-- privado o no, para supervisar.
--
-- De paso corrige un bug real encontrado en la prueba: routine_exercises/
-- routine_exercise_sets/program_routines/diet_plan_blocks/diet_plan_meals
-- (las tablas "hijas" con el contenido real de cada rutina/programa/plan)
-- nunca se tocaron en la Fase D — su SELECT seguía exigiendo
-- trainer_id = auth.uid() sin excepción, así que un compañero veía la
-- rutina en la lista pero con la lista de ejercicios vacía.

-- ----------------------------------------------------------------------------
-- 1. Compartir es opt-in, por ítem
-- ----------------------------------------------------------------------------

alter table public.routines add column is_shared boolean not null default false;
alter table public.programs add column is_shared boolean not null default false;
alter table public.diet_plans add column is_shared boolean not null default false;

comment on column public.routines.is_shared is
  'Si es true, cualquier compañero activo del mismo gimnasio puede verla y asignarla a sus clientes (nunca editarla) — decisión: biblioteca privada por default, compartir es opt-in. El contenido del admin se ve igual sin importar este valor (es la biblioteca oficial del gimnasio).';
comment on column public.programs.is_shared is 'Ver comentario en routines.is_shared.';
comment on column public.diet_plans.is_shared is 'Ver comentario en routines.is_shared.';

-- ----------------------------------------------------------------------------
-- 2. Visibilidad: propio, o compartido+mismo gimnasio, o el admin ve/es
--    visto por todo su equipo
-- ----------------------------------------------------------------------------

create or replace function public.can_view_gym_item(p_owner_id uuid, p_is_shared boolean)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    p_owner_id = auth.uid()
    or (
      p_is_shared
      and exists (
        select 1
        from public.gym_members me
        join public.gym_members owner on owner.gym_id = me.gym_id
        where me.profile_id = auth.uid() and me.status = 'active'
          and owner.profile_id = p_owner_id and owner.status = 'active'
      )
    )
    -- El admin ve todo lo de su equipo, compartido o no (supervisión).
    or exists (
      select 1
      from public.gym_members me
      join public.gym_members owner on owner.gym_id = me.gym_id
      where me.profile_id = auth.uid() and me.status = 'active' and me.role = 'admin'
        and owner.profile_id = p_owner_id and owner.status = 'active'
    )
    -- Lo del admin es la biblioteca "oficial" — todo su equipo lo ve
    -- siempre, sin necesidad de marcarlo compartido.
    or exists (
      select 1
      from public.gym_members owner
      join public.gym_members me on me.gym_id = owner.gym_id
      where owner.profile_id = p_owner_id and owner.status = 'active' and owner.role = 'admin'
        and me.profile_id = auth.uid() and me.status = 'active'
    );
$$;

comment on function public.can_view_gym_item is
  'Fase D (revisión): propio, o compartido (is_shared) y mismo gimnasio, o yo soy admin de ese gimnasio, o el dueño es el admin de mi gimnasio (su biblioteca es la oficial). Reemplaza can_view_gym_content para routines/programs/diet_plans — el editar ya NO se comparte, solo el dueño edita (trainer_id = auth.uid() directo en las políticas de UPDATE/DELETE).';

grant execute on function public.can_view_gym_item(uuid, boolean) to authenticated;

-- ----------------------------------------------------------------------------
-- 3. routines / programs / diet_plans: select por can_view_gym_item,
--    editar/borrar vuelve a ser solo del dueño (se quita can_edit_gym_content)
-- ----------------------------------------------------------------------------

drop policy if exists routines_select_own on public.routines;
create policy routines_select_own on public.routines
  for select to authenticated
  using (public.can_view_gym_item(trainer_id, is_shared));

drop policy if exists routines_update_own on public.routines;
create policy routines_update_own on public.routines
  for update to authenticated
  using (trainer_id = auth.uid())
  with check (trainer_id = auth.uid());

drop policy if exists routines_delete_own on public.routines;
create policy routines_delete_own on public.routines
  for delete to authenticated
  using (trainer_id = auth.uid());

drop policy if exists programs_select_own on public.programs;
create policy programs_select_own on public.programs
  for select to authenticated
  using (public.can_view_gym_item(trainer_id, is_shared));

drop policy if exists programs_update_own on public.programs;
create policy programs_update_own on public.programs
  for update to authenticated
  using (trainer_id = auth.uid())
  with check (trainer_id = auth.uid());

drop policy if exists programs_delete_own on public.programs;
create policy programs_delete_own on public.programs
  for delete to authenticated
  using (trainer_id = auth.uid());

drop policy if exists diet_plans_select_own on public.diet_plans;
create policy diet_plans_select_own on public.diet_plans
  for select to authenticated
  using (public.can_view_gym_item(trainer_id, is_shared));

drop policy if exists diet_plans_update_own on public.diet_plans;
create policy diet_plans_update_own on public.diet_plans
  for update to authenticated
  using (trainer_id = auth.uid())
  with check (trainer_id = auth.uid());

drop policy if exists diet_plans_delete_own on public.diet_plans;
create policy diet_plans_delete_own on public.diet_plans
  for delete to authenticated
  using (trainer_id = auth.uid());

-- ----------------------------------------------------------------------------
-- 4. Bug real: las tablas "hijas" nunca dejaban ver el contenido de un
--    compañero aunque la rutina/programa/plan sí fuera visible.
-- ----------------------------------------------------------------------------

drop policy if exists routine_exercises_select_own on public.routine_exercises;
create policy routine_exercises_select_own on public.routine_exercises
  for select to authenticated
  using (
    exists (
      select 1 from public.routines r
      where r.id = routine_exercises.routine_id and public.can_view_gym_item(r.trainer_id, r.is_shared)
    )
  );

drop policy if exists routine_exercise_sets_select_own on public.routine_exercise_sets;
create policy routine_exercise_sets_select_own on public.routine_exercise_sets
  for select to authenticated
  using (
    exists (
      select 1 from public.routine_exercises re
      join public.routines r on r.id = re.routine_id
      where re.id = routine_exercise_sets.routine_exercise_id
        and public.can_view_gym_item(r.trainer_id, r.is_shared)
    )
  );

drop policy if exists program_routines_select_own on public.program_routines;
create policy program_routines_select_own on public.program_routines
  for select to authenticated
  using (
    exists (
      select 1 from public.programs p
      where p.id = program_routines.program_id and public.can_view_gym_item(p.trainer_id, p.is_shared)
    )
  );

drop policy if exists diet_plan_blocks_select_own on public.diet_plan_blocks;
create policy diet_plan_blocks_select_own on public.diet_plan_blocks
  for select to authenticated
  using (
    exists (
      select 1 from public.diet_plans p
      where p.id = diet_plan_blocks.diet_plan_id and public.can_view_gym_item(p.trainer_id, p.is_shared)
    )
  );

drop policy if exists diet_plan_meals_select_own on public.diet_plan_meals;
create policy diet_plan_meals_select_own on public.diet_plan_meals
  for select to authenticated
  using (
    exists (
      select 1 from public.diet_plans p
      where p.id = diet_plan_meals.diet_plan_id and public.can_view_gym_item(p.trainer_id, p.is_shared)
    )
  );

-- ----------------------------------------------------------------------------
-- 5. Asignar a un cliente un programa/rutina/plan de otra persona solo
--    si de verdad puedo VERLO (visibilidad, no edición).
-- ----------------------------------------------------------------------------

drop policy if exists client_assignments_insert_own_as_trainer on public.client_assignments;
create policy client_assignments_insert_own_as_trainer on public.client_assignments
  for insert to authenticated
  with check (
    current_user_role() = 'trainer'
    and public.can_manage_client(client_id)
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
    and (
      program_id is null
      or exists (
        select 1 from public.programs p
        where p.id = client_assignments.program_id and public.can_view_gym_item(p.trainer_id, p.is_shared)
      )
    )
    and (
      routine_id is null
      or exists (
        select 1 from public.routines r
        where r.id = client_assignments.routine_id and public.can_view_gym_item(r.trainer_id, r.is_shared)
      )
    )
  );

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
      where p.id = diet_plan_assignments.diet_plan_id and public.can_view_gym_item(p.trainer_id, p.is_shared)
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
      where r.id = assignment_overrides.routine_id and public.can_view_gym_item(r.trainer_id, r.is_shared)
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
      where r.id = assignment_overrides.routine_id and public.can_view_gym_item(r.trainer_id, r.is_shared)
    )
  );
