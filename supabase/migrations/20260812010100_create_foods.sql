-- Catálogo de alimentos individuales (no platillos). trainer_id nulo =
-- alimento genérico, visible para todos los entrenadores; con trainer_id
-- = alimento personalizado, solo visible para quien lo creó.
create table public.foods (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid references public.profiles (id) on delete cascade,
  food_category_id uuid not null references public.food_categories (id) on delete restrict,
  name text not null,
  calories_per_100g numeric not null,
  protein_per_100g numeric not null,
  carbs_per_100g numeric not null,
  fat_per_100g numeric not null,
  -- Medida casera común (p. ej. "huevo mediano" = 50 g) para que el
  -- cliente no dependa de una báscula. Las dos columnas van juntas: o
  -- las dos tienen valor, o ninguna.
  household_unit_name text,
  household_unit_grams numeric,
  created_at timestamptz not null default now(),
  constraint foods_macros_non_negative check (
    calories_per_100g >= 0 and protein_per_100g >= 0
    and carbs_per_100g >= 0 and fat_per_100g >= 0
  ),
  constraint foods_household_unit_grams_positive check (
    household_unit_grams is null or household_unit_grams > 0
  ),
  constraint foods_household_unit_pair check (
    (household_unit_name is null) = (household_unit_grams is null)
  )
);

comment on table public.foods is
  'Alimento individual (no platillo). trainer_id nulo = genérico, disponible para todos los entrenadores; con trainer_id = personalizado, solo visible para quien lo creó.';
comment on column public.foods.household_unit_grams is
  'A cuántos gramos equivale la medida casera (household_unit_name), p. ej. 50 g para "huevo mediano".';

create index foods_trainer_id_idx on public.foods (trainer_id);
create index foods_food_category_id_idx on public.foods (food_category_id);

alter table public.foods enable row level security;

-- Un entrenador ve el catálogo genérico más el suyo propio.
create policy "foods_select_generic_or_own"
  on public.foods for select
  using (trainer_id is null or trainer_id = auth.uid());

create policy "foods_insert_own_as_trainer"
  on public.foods for insert
  with check (
    trainer_id = auth.uid()
    and public.current_user_role() = 'trainer'
  );

create policy "foods_update_own"
  on public.foods for update
  using (trainer_id = auth.uid())
  with check (trainer_id = auth.uid());

create policy "foods_delete_own"
  on public.foods for delete
  using (trainer_id = auth.uid());

create policy "foods_select_superadmin_sees_all"
  on public.foods for select
  using (public.current_user_role() = 'superadmin');

-- Catálogo genérico inicial: alimentos comunes de la dieta
-- latinoamericana, con valores aproximados por 100 g (fuente: tablas
-- nutricionales de referencia tipo USDA) y su medida casera cuando
-- corresponde. trainer_id se deja nulo a propósito.
insert into public.foods (
  food_category_id, name, calories_per_100g, protein_per_100g,
  carbs_per_100g, fat_per_100g, household_unit_name, household_unit_grams
)
select c.id, v.name, v.calories, v.protein, v.carbs, v.fat, v.unit_name, v.unit_grams
from (values
  ('protein', 'Huevo', 155, 13, 1.1, 11, 'huevo mediano', 50),
  ('protein', 'Pechuga de pollo', 165, 31, 0, 3.6, 'pechuga mediana', 120),
  ('protein', 'Carne de res (molida, magra)', 250, 26, 0, 17, null, null),
  ('protein', 'Atún en agua', 116, 26, 0, 1, 'lata mediana', 140),
  ('legume', 'Frijoles cocidos', 127, 8.7, 22.8, 0.5, 'taza', 172),
  ('legume', 'Lentejas cocidas', 116, 9, 20, 0.4, 'taza', 198),
  ('carbohydrate', 'Arroz blanco cocido', 130, 2.7, 28, 0.3, 'taza', 158),
  ('carbohydrate', 'Tortilla de maíz', 218, 5.7, 44.6, 2.6, 'tortilla', 30),
  ('carbohydrate', 'Pan blanco', 265, 9, 49, 3.2, 'rebanada', 25),
  ('carbohydrate', 'Avena en hojuelas (cruda)', 389, 16.9, 66.3, 6.9, 'taza', 90),
  ('carbohydrate', 'Papa cocida', 87, 1.9, 20.1, 0.1, 'papa mediana', 150),
  ('fruit', 'Plátano', 89, 1.1, 22.8, 0.3, 'plátano mediano', 118),
  ('fruit', 'Manzana', 52, 0.3, 13.8, 0.2, 'manzana mediana', 182),
  ('fruit', 'Papaya', 43, 0.5, 10.8, 0.3, 'taza en cubos', 145),
  ('fat', 'Aguacate', 160, 2, 8.5, 14.7, 'aguacate mediano', 150),
  ('fat', 'Aceite de oliva', 884, 0, 0, 100, 'cucharada', 13.5),
  ('fat', 'Almendras', 579, 21.2, 21.6, 49.9, 'puñado (23 almendras)', 28),
  ('dairy', 'Leche entera', 61, 3.2, 4.8, 3.3, 'taza', 244),
  ('dairy', 'Yogur natural', 61, 3.5, 4.7, 3.3, 'taza', 245),
  ('dairy', 'Queso panela', 150, 18, 3, 8, 'rebanada', 30),
  ('vegetable', 'Lechuga', 15, 1.4, 2.9, 0.2, 'taza', 36),
  ('vegetable', 'Zanahoria', 41, 0.9, 9.6, 0.2, 'zanahoria mediana', 61),
  ('vegetable', 'Brócoli cocido', 35, 2.4, 7.2, 0.4, 'taza', 156),
  ('beverage', 'Agua natural', 0, 0, 0, 0, null, null)
) as v(category_slug, name, calories, protein, carbs, fat, unit_name, unit_grams)
join public.food_categories c on c.slug = v.category_slug;
