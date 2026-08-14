-- Catálogo de comunidad: todos los entrenadores pueden VER los
-- alimentos/platillos de todos los demás (antes solo veían los
-- esenciales + los suyos), para poder buscarlos y agregarlos a su
-- propio catálogo. Escribir (insert/update/delete) sigue restringido al
-- dueño — ver pg_policies previas para foods/dishes/dish_ingredients.
--
-- "forked_from" registra de qué alimento/platillo (esencial o de otro
-- entrenador) se copió este, tanto para detectar "ya está en mi
-- catálogo" en la pestaña Comunidad como para el flujo de "editar un
-- esencial crea mi copia personalizada" (nunca se edita la fila
-- compartida, se crea una fila propia).

alter table public.foods
  add column forked_from uuid references public.foods(id) on delete set null;
comment on column public.foods.forked_from is 'Alimento esencial o de otro entrenador del que se copió este (vía "Agregar a mi catálogo" o al editar uno que no es tuyo). Nulo si se creó desde cero.';

alter table public.dishes
  add column forked_from uuid references public.dishes(id) on delete set null;
comment on column public.dishes.forked_from is 'Platillo esencial o de otro entrenador del que se copió este. Nulo si se creó desde cero.';

drop policy if exists "foods_select_generic_or_own" on public.foods;
drop policy if exists "foods_select_superadmin_sees_all" on public.foods;
create policy "foods_select_all_trainers"
  on public.foods for select
  to authenticated
  using (current_user_role() = ANY (ARRAY['trainer'::user_role, 'superadmin'::user_role]));

drop policy if exists "dishes_select_generic_or_own" on public.dishes;
drop policy if exists "dishes_select_superadmin_sees_all" on public.dishes;
create policy "dishes_select_all_trainers"
  on public.dishes for select
  to authenticated
  using (current_user_role() = ANY (ARRAY['trainer'::user_role, 'superadmin'::user_role]));

-- dish_ingredients hereda visibilidad de su platillo (que ahora es
-- visible para cualquier entrenador), para poder mostrar los
-- ingredientes de un platillo de la comunidad antes de agregarlo.
drop policy if exists "dish_ingredients_select_own" on public.dish_ingredients;
create policy "dish_ingredients_select_via_dish"
  on public.dish_ingredients for select
  to authenticated
  using (
    exists (
      select 1 from public.dishes d
      where d.id = dish_ingredients.dish_id
    )
  );
