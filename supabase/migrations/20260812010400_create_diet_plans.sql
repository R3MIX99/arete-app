-- Plantilla reutilizable de alimentación (igual que las rutinas y los
-- programas: no está atada a un cliente específico).
create table public.diet_plans (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  goal_label text,
  daily_calorie_target numeric,
  created_at timestamptz not null default now(),
  constraint diet_plans_calorie_target_positive check (
    daily_calorie_target is null or daily_calorie_target > 0
  )
);

comment on table public.diet_plans is
  'Plantilla reutilizable de plan de alimentación (no asigna clientes directamente; eso vive en diet_plan_assignments).';
comment on column public.diet_plans.goal_label is
  'Objetivo del plan en texto libre, p. ej. "Déficit calórico alto en proteína".';

create index diet_plans_trainer_id_idx on public.diet_plans (trainer_id);

alter table public.diet_plans enable row level security;

create policy "diet_plans_select_own"
  on public.diet_plans for select
  using (trainer_id = auth.uid());

create policy "diet_plans_insert_own_as_trainer"
  on public.diet_plans for insert
  with check (
    trainer_id = auth.uid()
    and public.current_user_role() = 'trainer'
  );

create policy "diet_plans_update_own"
  on public.diet_plans for update
  using (trainer_id = auth.uid())
  with check (trainer_id = auth.uid());

create policy "diet_plans_delete_own"
  on public.diet_plans for delete
  using (trainer_id = auth.uid());

create policy "diet_plans_select_superadmin_sees_all"
  on public.diet_plans for select
  using (public.current_user_role() = 'superadmin');

-- Qué compone cada comida del día dentro del plan: un platillo del
-- catálogo o un alimento individual (nunca los dos), con su cantidad.
create table public.diet_plan_meals (
  id uuid primary key default gen_random_uuid(),
  diet_plan_id uuid not null references public.diet_plans (id) on delete cascade,
  meal_type public.meal_type not null,
  order_index integer not null default 0,
  dish_id uuid references public.dishes (id) on delete restrict,
  food_id uuid references public.foods (id) on delete restrict,
  -- Solo aplica cuando food_id está seteado: un platillo ya trae su
  -- propia composición y cantidad definidas por sus ingredientes.
  quantity_grams numeric,
  created_at timestamptz not null default now(),
  constraint diet_plan_meals_dish_xor_food check (
    (dish_id is not null and food_id is null)
    or (dish_id is null and food_id is not null)
  ),
  constraint diet_plan_meals_food_quantity check (
    food_id is null or (quantity_grams is not null and quantity_grams > 0)
  )
);

comment on table public.diet_plan_meals is
  'Un platillo o un alimento individual dentro de una comida del día (desayuno/almuerzo/cena/snack) de un plan de alimentación.';

create index diet_plan_meals_diet_plan_id_idx on public.diet_plan_meals (diet_plan_id);
create index diet_plan_meals_dish_id_idx on public.diet_plan_meals (dish_id)
  where dish_id is not null;
create index diet_plan_meals_food_id_idx on public.diet_plan_meals (food_id)
  where food_id is not null;

alter table public.diet_plan_meals enable row level security;

create policy "diet_plan_meals_select_own"
  on public.diet_plan_meals for select
  using (
    exists (
      select 1 from public.diet_plans p
      where p.id = diet_plan_meals.diet_plan_id and p.trainer_id = auth.uid()
    )
  );

create policy "diet_plan_meals_insert_own"
  on public.diet_plan_meals for insert
  with check (
    exists (
      select 1 from public.diet_plans p
      where p.id = diet_plan_meals.diet_plan_id and p.trainer_id = auth.uid()
    )
    and (
      dish_id is null
      or exists (
        select 1 from public.dishes d
        where d.id = diet_plan_meals.dish_id
          and (d.trainer_id is null or d.trainer_id = auth.uid())
      )
    )
    and (
      food_id is null
      or exists (
        select 1 from public.foods f
        where f.id = diet_plan_meals.food_id
          and (f.trainer_id is null or f.trainer_id = auth.uid())
      )
    )
  );

create policy "diet_plan_meals_update_own"
  on public.diet_plan_meals for update
  using (
    exists (
      select 1 from public.diet_plans p
      where p.id = diet_plan_meals.diet_plan_id and p.trainer_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.diet_plans p
      where p.id = diet_plan_meals.diet_plan_id and p.trainer_id = auth.uid()
    )
  );

create policy "diet_plan_meals_delete_own"
  on public.diet_plan_meals for delete
  using (
    exists (
      select 1 from public.diet_plans p
      where p.id = diet_plan_meals.diet_plan_id and p.trainer_id = auth.uid()
    )
  );
