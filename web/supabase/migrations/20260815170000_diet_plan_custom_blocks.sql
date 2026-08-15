-- Bloques de comida personalizables por plan (antes: 4 secciones fijas
-- desayuno/almuerzo/cena/snack vía enum meal_type). Mismo espíritu que
-- las semanas de un programa: se pueden agregar, quitar, reordenar y
-- clonar, siempre debe quedar al menos uno.

create table public.diet_plan_blocks (
  id uuid primary key default gen_random_uuid(),
  diet_plan_id uuid not null references public.diet_plans(id) on delete cascade,
  name text not null,
  order_index integer not null default 0,
  created_at timestamptz not null default now()
);

comment on table public.diet_plan_blocks is 'Bloques/secciones de un plan nutricional (desayuno, cena, preentreno, etc.) — nombre libre, orden editable.';

alter table public.diet_plan_blocks enable row level security;

create policy diet_plan_blocks_select_own on public.diet_plan_blocks
  for select to authenticated
  using (exists (select 1 from public.diet_plans p where p.id = diet_plan_blocks.diet_plan_id and p.trainer_id = auth.uid()));

create policy diet_plan_blocks_insert_own on public.diet_plan_blocks
  for insert to authenticated
  with check (exists (select 1 from public.diet_plans p where p.id = diet_plan_blocks.diet_plan_id and p.trainer_id = auth.uid()));

create policy diet_plan_blocks_update_own on public.diet_plan_blocks
  for update to authenticated
  using (exists (select 1 from public.diet_plans p where p.id = diet_plan_blocks.diet_plan_id and p.trainer_id = auth.uid()))
  with check (exists (select 1 from public.diet_plans p where p.id = diet_plan_blocks.diet_plan_id and p.trainer_id = auth.uid()));

create policy diet_plan_blocks_delete_own on public.diet_plan_blocks
  for delete to authenticated
  using (exists (select 1 from public.diet_plans p where p.id = diet_plan_blocks.diet_plan_id and p.trainer_id = auth.uid()));

-- Backfill: 4 bloques por defecto para cada plan existente, y se
-- reasignan los elementos ya guardados según su meal_type anterior.
insert into public.diet_plan_blocks (diet_plan_id, name, order_index)
select id, 'Desayuno', 0 from public.diet_plans
union all
select id, 'Almuerzo', 1 from public.diet_plans
union all
select id, 'Cena', 2 from public.diet_plans
union all
select id, 'Snack', 3 from public.diet_plans;

alter table public.diet_plan_meals add column block_id uuid references public.diet_plan_blocks(id) on delete cascade;

update public.diet_plan_meals dpm
set block_id = b.id
from public.diet_plan_blocks b
where b.diet_plan_id = dpm.diet_plan_id
  and b.name = (case dpm.meal_type
    when 'breakfast' then 'Desayuno'
    when 'lunch' then 'Almuerzo'
    when 'dinner' then 'Cena'
    when 'snack' then 'Snack'
  end);

alter table public.diet_plan_meals alter column block_id set not null;
alter table public.diet_plan_meals drop column meal_type;
