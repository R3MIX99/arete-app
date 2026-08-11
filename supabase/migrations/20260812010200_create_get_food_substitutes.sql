-- Sustitutos automáticos: dado un alimento y la cantidad usada en una
-- comida, calcula sus calorías y proteína en esa cantidad y devuelve
-- otros alimentos de la misma categoría cuya cantidad (ajustada para
-- igualar las calorías del original) caiga dentro de la tolerancia de
-- proteína pedida. No requiere que el entrenador apruebe cada
-- sustitución: el cliente la usará directamente en la Fase 10.
--
-- `security invoker` (el valor por defecto) a propósito: así la función
-- hereda las políticas de RLS de `foods` para quien la llama, y ya
-- devuelve "genéricos + los del entrenador correspondiente" sin lógica
-- extra ni tener que reconstruir esa regla acá.
create or replace function public.get_food_substitutes(
  p_food_id uuid,
  p_quantity_grams numeric,
  p_tolerance_percent numeric default 15
)
returns table (
  food_id uuid,
  name text,
  quantity_grams numeric,
  household_unit_name text,
  household_unit_grams numeric,
  household_unit_quantity numeric,
  calories numeric,
  protein numeric,
  carbs numeric,
  fat numeric
)
language sql
stable
security invoker
set search_path = public
as $$
  with source as (
    select
      f.food_category_id,
      f.calories_per_100g * p_quantity_grams / 100 as target_calories,
      f.protein_per_100g * p_quantity_grams / 100 as target_protein
    from public.foods f
    where f.id = p_food_id
  ),
  candidates as (
    select
      f.id,
      f.name,
      f.household_unit_name,
      f.household_unit_grams,
      -- Gramos del sustituto tales que sus calorías igualen las del
      -- original en la cantidad pedida.
      round(s.target_calories * 100 / f.calories_per_100g, 1) as adj_grams,
      f.protein_per_100g,
      f.carbs_per_100g,
      f.fat_per_100g,
      f.calories_per_100g,
      s.target_protein
    from public.foods f
    cross join source s
    where f.food_category_id = s.food_category_id
      and f.id <> p_food_id
      and f.calories_per_100g > 0
  )
  select
    c.id,
    c.name,
    c.adj_grams,
    c.household_unit_name,
    c.household_unit_grams,
    case
      when c.household_unit_grams is not null and c.household_unit_grams > 0
        then round(c.adj_grams / c.household_unit_grams * 4) / 4
      else null
    end,
    round(c.calories_per_100g * c.adj_grams / 100, 1),
    round(c.protein_per_100g * c.adj_grams / 100, 1),
    round(c.carbs_per_100g * c.adj_grams / 100, 1),
    round(c.fat_per_100g * c.adj_grams / 100, 1)
  from candidates c
  where c.target_protein = 0
     or abs(c.protein_per_100g * c.adj_grams / 100 - c.target_protein)
        <= c.target_protein * p_tolerance_percent / 100
  order by abs(c.protein_per_100g * c.adj_grams / 100 - c.target_protein) asc;
$$;

comment on function public.get_food_substitutes(uuid, numeric, numeric) is
  'Dado un alimento y la cantidad usada, devuelve alimentos de la misma categoría con la cantidad ajustada para que sus calorías coincidan y su proteína quede dentro de la tolerancia pedida (15% por defecto).';

revoke execute on function public.get_food_substitutes(uuid, numeric, numeric)
  from public, anon;
grant execute on function public.get_food_substitutes(uuid, numeric, numeric)
  to authenticated;
