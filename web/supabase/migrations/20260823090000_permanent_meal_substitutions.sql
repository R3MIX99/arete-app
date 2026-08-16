-- Una sustitución podía ser solo "de hoy". Ahora el cliente puede
-- elegir cambiar el alimento nada más por ese día, o dejarlo cambiado
-- en todo su plan (solo para él — el plan del entrenador no se toca).
alter table public.client_meal_substitutions
  add column is_permanent boolean not null default false;

comment on column public.client_meal_substitutions.is_permanent is
  'true = el cambio aplica a todos los días del plan de este cliente; false = solo aplica a substitution_date.';

-- En las permanentes la fecha deja de tener sentido como filtro (valen
-- para siempre), así que se permite null y se guarda solo como
-- referencia de cuándo se hizo el cambio.
alter table public.client_meal_substitutions
  alter column substitution_date drop not null;

-- No tiene sentido tener dos sustituciones vigentes para el mismo
-- alimento del mismo bloque: una permanente por objetivo, y una por día
-- y objetivo. Se usan índices parciales porque dish_ingredient_id es
-- nullable (un null nunca "choca" en un unique normal).
create unique index client_meal_subs_permanent_meal_uniq
  on public.client_meal_substitutions (client_id, diet_plan_meal_id)
  where is_permanent and dish_ingredient_id is null;

create unique index client_meal_subs_permanent_ingredient_uniq
  on public.client_meal_substitutions (client_id, diet_plan_meal_id, dish_ingredient_id)
  where is_permanent and dish_ingredient_id is not null;
