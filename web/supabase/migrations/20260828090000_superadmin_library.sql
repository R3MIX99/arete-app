-- Biblioteca de Areté editable por el superadmin: ejercicios, alimentos
-- y platillos con trainer_id IS NULL son "esenciales de Areté" (ya
-- existía el concepto — trainers los ven en su biblioteca y los pueden
-- copiar/editar como propios), pero hasta ahora NADIE podía crearlos,
-- editarlos ni borrarlos: las políticas de escritura solo cubrían
-- "trainer_id = auth.uid()". Se agregan las políticas que faltaban
-- para que el superadmin administre ese catálogo global, y se agrega
-- imagen a ejercicios (antes solo tenían video).

alter table public.exercises add column image_path text;
comment on column public.exercises.image_path is
  'Foto del ejercicio (bucket exercise-images). El video (video_url) sigue siendo aparte, para YouTube.';

insert into storage.buckets (id, name, public)
values ('exercise-images', 'exercise-images', true)
on conflict (id) do nothing;

create policy exercise_images_public_select on storage.objects
  for select using (bucket_id = 'exercise-images');

create policy exercise_images_trainer_manage_own on storage.objects
  for all to authenticated
  using (bucket_id = 'exercise-images' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'exercise-images' and (storage.foldername(name))[1] = auth.uid()::text);

-- El superadmin sube las fotos del catálogo global bajo la carpeta
-- "global/" (no tiene un uid de "dueño" como los entrenadores).
create policy exercise_images_superadmin_manage_global on storage.objects
  for all to authenticated
  using (
    bucket_id = 'exercise-images'
    and (storage.foldername(name))[1] = 'global'
    and current_user_role() = 'superadmin'
  )
  with check (
    bucket_id = 'exercise-images'
    and (storage.foldername(name))[1] = 'global'
    and current_user_role() = 'superadmin'
  );

-- food-images ya existía (para alimentos y platillos); le falta el
-- mismo permiso para que el superadmin suba fotos del catálogo global.
create policy food_images_superadmin_manage_global on storage.objects
  for all to authenticated
  using (
    bucket_id = 'food-images'
    and (storage.foldername(name))[1] = 'global'
    and current_user_role() = 'superadmin'
  )
  with check (
    bucket_id = 'food-images'
    and (storage.foldername(name))[1] = 'global'
    and current_user_role() = 'superadmin'
  );

-- Ejercicios: crear/editar/borrar SOLO filas del catálogo global
-- (trainer_id is null). Las filas de un entrenador siguen siendo
-- intocables para el superadmin — solo administra lo de Areté.
create policy exercises_insert_superadmin_global on public.exercises
  for insert to authenticated
  with check (trainer_id is null and current_user_role() = 'superadmin');
create policy exercises_update_superadmin_global on public.exercises
  for update to authenticated
  using (trainer_id is null and current_user_role() = 'superadmin')
  with check (trainer_id is null and current_user_role() = 'superadmin');
create policy exercises_delete_superadmin_global on public.exercises
  for delete to authenticated
  using (trainer_id is null and current_user_role() = 'superadmin');

create policy dishes_insert_superadmin_global on public.dishes
  for insert to authenticated
  with check (trainer_id is null and current_user_role() = 'superadmin');
create policy dishes_update_superadmin_global on public.dishes
  for update to authenticated
  using (trainer_id is null and current_user_role() = 'superadmin')
  with check (trainer_id is null and current_user_role() = 'superadmin');
create policy dishes_delete_superadmin_global on public.dishes
  for delete to authenticated
  using (trainer_id is null and current_user_role() = 'superadmin');

create policy foods_insert_superadmin_global on public.foods
  for insert to authenticated
  with check (trainer_id is null and current_user_role() = 'superadmin');
create policy foods_update_superadmin_global on public.foods
  for update to authenticated
  using (trainer_id is null and current_user_role() = 'superadmin')
  with check (trainer_id is null and current_user_role() = 'superadmin');
create policy foods_delete_superadmin_global on public.foods
  for delete to authenticated
  using (trainer_id is null and current_user_role() = 'superadmin');

-- Los ingredientes de un platillo global se administran junto con el
-- platillo — mismo criterio (trainer_id is null en el platillo dueño).
create policy dish_ingredients_insert_superadmin_global on public.dish_ingredients
  for insert to authenticated
  with check (
    current_user_role() = 'superadmin'
    and exists (select 1 from public.dishes d where d.id = dish_ingredients.dish_id and d.trainer_id is null)
  );
create policy dish_ingredients_update_superadmin_global on public.dish_ingredients
  for update to authenticated
  using (
    current_user_role() = 'superadmin'
    and exists (select 1 from public.dishes d where d.id = dish_ingredients.dish_id and d.trainer_id is null)
  )
  with check (
    current_user_role() = 'superadmin'
    and exists (select 1 from public.dishes d where d.id = dish_ingredients.dish_id and d.trainer_id is null)
  );
create policy dish_ingredients_delete_superadmin_global on public.dish_ingredients
  for delete to authenticated
  using (
    current_user_role() = 'superadmin'
    and exists (select 1 from public.dishes d where d.id = dish_ingredients.dish_id and d.trainer_id is null)
  );
