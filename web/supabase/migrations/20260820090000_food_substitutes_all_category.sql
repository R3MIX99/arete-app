-- El cliente reportó que al sustituir un alimento solo le aparecía una
-- o dos alternativas (ej. pechuga de pollo -> solo claras de huevo) en
-- vez de todo su catálogo de la misma categoría. Causa: el filtro de
-- tolerancia de proteína comparaba la proteína a la cantidad AJUSTADA
-- para igualar calorías — dos alimentos de la misma categoría con
-- densidades de proteína/caloría muy distintas (ej. pechuga de pollo
-- 31g/165kcal vs. atún 26g/116kcal) nunca pasaban el 15% de tolerancia
-- aunque sean sustitutos perfectamente razonables dentro de "proteína".
--
-- Ahora se devuelven TODAS las alternativas de la misma categoría
-- (excepto el alimento original), ordenadas por qué tan parecida es su
-- proteína a la cantidad ajustada — la mejor coincidencia primero, pero
-- sin excluir ninguna. p_tolerance_percent se deja en la firma por
-- compatibilidad pero ya no filtra nada.
create or replace function public.get_food_substitutes(
  p_food_id uuid,
  p_quantity_grams numeric,
  p_tolerance_percent numeric default 15
)
returns table(
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
set search_path to 'public'
as $function$
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
  order by abs(c.protein_per_100g * c.adj_grams / 100 - c.target_protein) asc;
$function$;
