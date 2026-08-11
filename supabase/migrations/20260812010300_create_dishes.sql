-- Tipo de comida del día, compartido por dishes y diet_plan_meals.
create type public.meal_type as enum ('breakfast', 'lunch', 'dinner', 'snack');

-- Platillo compuesto (p. ej. "huevos con verduras"), armado a partir de
-- alimentos individuales del catálogo. trainer_id nulo = genérico, igual
-- que en foods (por ahora ningún platillo se precarga como genérico, la
-- columna solo deja la puerta abierta para un catálogo curado a futuro).
create table public.dishes (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid references public.profiles (id) on delete cascade,
  food_category_id uuid references public.food_categories (id) on delete set null,
  name text not null,
  description text,
  meal_type public.meal_type not null,
  created_at timestamptz not null default now()
);

comment on table public.dishes is
  'Platillo compuesto por varios alimentos del catálogo (ver dish_ingredients). trainer_id nulo = genérico; con trainer_id = creado por ese entrenador.';
comment on column public.dishes.food_category_id is
  'Categoría general del platillo, opcional (p. ej. para filtrarlo junto con alimentos individuales de esa misma categoría).';

create index dishes_trainer_id_idx on public.dishes (trainer_id);
create index dishes_meal_type_idx on public.dishes (meal_type);

alter table public.dishes enable row level security;

create policy "dishes_select_generic_or_own"
  on public.dishes for select
  using (trainer_id is null or trainer_id = auth.uid());

create policy "dishes_insert_own_as_trainer"
  on public.dishes for insert
  with check (
    trainer_id = auth.uid()
    and public.current_user_role() = 'trainer'
  );

create policy "dishes_update_own"
  on public.dishes for update
  using (trainer_id = auth.uid())
  with check (trainer_id = auth.uid());

create policy "dishes_delete_own"
  on public.dishes for delete
  using (trainer_id = auth.uid());

create policy "dishes_select_superadmin_sees_all"
  on public.dishes for select
  using (public.current_user_role() = 'superadmin');

-- Ingredientes de un platillo. La medida casera de cada ingrediente NO
-- se guarda acá: se calcula al vuelo dividiendo quantity_grams entre el
-- household_unit_grams del alimento (ver la capa de la app), para poder
-- mostrar algo como "4 huevos" sin duplicar ese dato.
create table public.dish_ingredients (
  id uuid primary key default gen_random_uuid(),
  dish_id uuid not null references public.dishes (id) on delete cascade,
  food_id uuid not null references public.foods (id) on delete restrict,
  quantity_grams numeric not null,
  order_index integer not null default 0,
  created_at timestamptz not null default now(),
  constraint dish_ingredients_quantity_positive check (quantity_grams > 0)
);

comment on table public.dish_ingredients is
  'Un alimento y su cantidad en gramos dentro de un platillo. La medida casera se calcula en la app dividiendo quantity_grams entre foods.household_unit_grams.';

create index dish_ingredients_dish_id_idx on public.dish_ingredients (dish_id);
create index dish_ingredients_food_id_idx on public.dish_ingredients (food_id);

alter table public.dish_ingredients enable row level security;

-- No hay trainer_id directo: la propiedad se resuelve a través del
-- platillo dueño, igual que routine_exercises con routines.
create policy "dish_ingredients_select_own"
  on public.dish_ingredients for select
  using (
    exists (
      select 1 from public.dishes d
      where d.id = dish_ingredients.dish_id and d.trainer_id = auth.uid()
    )
  );

create policy "dish_ingredients_insert_own"
  on public.dish_ingredients for insert
  with check (
    exists (
      select 1 from public.dishes d
      where d.id = dish_ingredients.dish_id and d.trainer_id = auth.uid()
    )
  );

create policy "dish_ingredients_update_own"
  on public.dish_ingredients for update
  using (
    exists (
      select 1 from public.dishes d
      where d.id = dish_ingredients.dish_id and d.trainer_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.dishes d
      where d.id = dish_ingredients.dish_id and d.trainer_id = auth.uid()
    )
  );

create policy "dish_ingredients_delete_own"
  on public.dish_ingredients for delete
  using (
    exists (
      select 1 from public.dishes d
      where d.id = dish_ingredients.dish_id and d.trainer_id = auth.uid()
    )
  );
