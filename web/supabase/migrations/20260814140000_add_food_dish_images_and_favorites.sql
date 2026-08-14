-- Imagen opcional para alimentos y platillos (si no hay imagen, la app
-- muestra un ícono según categoría/tipo de comida en su lugar).
alter table public.foods
  add column image_path text;
comment on column public.foods.image_path is 'Ruta dentro del bucket público "food-images" a la foto del alimento. Nulo = mostrar el ícono de su categoría.';

alter table public.dishes
  add column image_path text;
comment on column public.dishes.image_path is 'Ruta dentro del bucket público "food-images" a la foto del platillo. Nulo = mostrar el ícono de su tipo de comida.';

-- Favoritos de alimentos por entrenador — tabla puente porque un
-- alimento genérico (trainer_id nulo) puede ser favorito de varios
-- entrenadores a la vez, cada uno con su propia lista.
create table public.food_favorites (
  trainer_id uuid not null references public.profiles(id) on delete cascade,
  food_id uuid not null references public.foods(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (trainer_id, food_id)
);
comment on table public.food_favorites is 'Alimentos marcados como favoritos por cada entrenador (independiente de quién creó el alimento).';

alter table public.food_favorites enable row level security;

create policy "food_favorites_trainer_select_own"
  on public.food_favorites for select
  to authenticated
  using (trainer_id = auth.uid());

create policy "food_favorites_trainer_insert_own"
  on public.food_favorites for insert
  to authenticated
  with check (trainer_id = auth.uid());

create policy "food_favorites_trainer_delete_own"
  on public.food_favorites for delete
  to authenticated
  using (trainer_id = auth.uid());

-- Bucket público para fotos de alimentos y platillos, misma convención
-- que "business-logos": carpeta = trainer_id dueño del archivo.
insert into storage.buckets (id, name, public)
values ('food-images', 'food-images', true)
on conflict (id) do nothing;

create policy "food_images_public_select"
  on storage.objects for select
  to public
  using (bucket_id = 'food-images');

create policy "food_images_trainer_manage_own"
  on storage.objects for all
  to authenticated
  using (bucket_id = 'food-images' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'food-images' and (storage.foldername(name))[1] = auth.uid()::text);
