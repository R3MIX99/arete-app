-- Categorías de alimentos: la pieza clave de la sustitución automática.
-- Dos alimentos de la misma categoría son intercambiables entre sí si sus
-- macros por porción equivalente son cercanos (ver la función
-- get_food_substitutes más adelante). Es una tabla, no un enum, para que
-- en el futuro se puedan agregar categorías sin una migración de esquema.
create table public.food_categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

comment on table public.food_categories is
  'Categoría de un alimento (proteína, carbohidrato, etc.). Dos alimentos de la misma categoría se consideran intercambiables entre sí para la sustitución automática.';

alter table public.food_categories enable row level security;

-- Tabla de referencia compartida: cualquier usuario autenticado la puede
-- leer (no hay nada sensible acá). Solo se administra desde migraciones,
-- no hay alta/edición desde la app en esta fase.
create policy "food_categories_select_authenticated"
  on public.food_categories for select
  to authenticated
  using (true);

insert into public.food_categories (slug, name, sort_order) values
  ('protein', 'Proteína', 1),
  ('legume', 'Legumbre', 2),
  ('carbohydrate', 'Carbohidrato', 3),
  ('vegetable', 'Verdura o ensalada', 4),
  ('fruit', 'Fruta', 5),
  ('fat', 'Grasa', 6),
  ('dairy', 'Lácteo', 7),
  ('beverage', 'Bebida', 8);
