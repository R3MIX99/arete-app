-- Fase 10: Panel de Cliente — Nutrición.
--
-- Hasta ahora nada de foods/dishes/diet_plans* tenía una policy de
-- SELECT para el rol "client" (solo entrenador/superadmin podían leer
-- catálogo y planes) — el cliente no podía ver absolutamente nada de su
-- propio plan nutricional. Se agregan las policies mínimas necesarias:
-- el cliente solo ve un plan (y sus bloques/comidas/platillos) si tiene
-- una asignación activa de ese plan; para "foods" se le da acceso de
-- lectura al catálogo completo, porque get_food_substitutes() necesita
-- poder comparar contra cualquier alimento de la misma categoría, no
-- solo los que ya están en su plan.

create policy diet_plans_select_own_as_client
  on public.diet_plans for select
  using (
    exists (
      select 1 from public.diet_plan_assignments dpa
      where dpa.diet_plan_id = diet_plans.id and dpa.client_id = auth.uid()
    )
  );

create policy diet_plan_blocks_select_as_client
  on public.diet_plan_blocks for select
  using (
    exists (
      select 1 from public.diet_plan_assignments dpa
      where dpa.diet_plan_id = diet_plan_blocks.diet_plan_id and dpa.client_id = auth.uid()
    )
  );

create policy diet_plan_meals_select_as_client
  on public.diet_plan_meals for select
  using (
    exists (
      select 1 from public.diet_plan_assignments dpa
      where dpa.diet_plan_id = diet_plan_meals.diet_plan_id and dpa.client_id = auth.uid()
    )
  );

create policy dishes_select_as_client
  on public.dishes for select
  using (
    exists (
      select 1
      from public.diet_plan_meals dpm
      join public.diet_plan_assignments dpa on dpa.diet_plan_id = dpm.diet_plan_id
      where dpm.dish_id = dishes.id and dpa.client_id = auth.uid()
    )
  );

create policy dish_ingredients_select_as_client
  on public.dish_ingredients for select
  using (
    exists (
      select 1
      from public.diet_plan_meals dpm
      join public.diet_plan_assignments dpa on dpa.diet_plan_id = dpm.diet_plan_id
      where dpm.dish_id = dish_ingredients.dish_id and dpa.client_id = auth.uid()
    )
  );

create policy foods_select_as_client
  on public.foods for select
  using (current_user_role() = 'client'::user_role);

-- Cada fila es una sustitución vigente para un día concreto: qué
-- alimento (directo en una comida, o ingrediente dentro de un platillo)
-- se cambió por cuál y en qué cantidad. dish_ingredient_id es null
-- cuando lo sustituido es un alimento suelto de la comida (no parte de
-- un platillo) — así la sustitución solo afecta a ese ingrediente
-- puntual y el resto del platillo se queda igual.
create table public.client_meal_substitutions (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles(id) on delete cascade,
  trainer_id uuid not null references public.profiles(id) on delete cascade,
  substitution_date date not null,
  diet_plan_meal_id uuid not null references public.diet_plan_meals(id) on delete cascade,
  dish_ingredient_id uuid references public.dish_ingredients(id) on delete cascade,
  original_food_id uuid not null references public.foods(id),
  substitute_food_id uuid not null references public.foods(id),
  quantity_grams numeric not null,
  created_at timestamptz not null default now()
);

alter table public.client_meal_substitutions enable row level security;

create policy client_meal_substitutions_select_own_as_client
  on public.client_meal_substitutions for select
  using (client_id = auth.uid());

create policy client_meal_substitutions_insert_own_as_client
  on public.client_meal_substitutions for insert
  with check (client_id = auth.uid());

create policy client_meal_substitutions_delete_own_as_client
  on public.client_meal_substitutions for delete
  using (client_id = auth.uid());

create policy client_meal_substitutions_select_own_as_trainer
  on public.client_meal_substitutions for select
  using (trainer_id = auth.uid());

create index client_meal_substitutions_lookup_idx
  on public.client_meal_substitutions (client_id, substitution_date);

create index client_meal_substitutions_trainer_idx
  on public.client_meal_substitutions (trainer_id, substitution_date desc);
