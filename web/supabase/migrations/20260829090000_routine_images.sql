-- Imagen de portada para rutinas. El panel del cliente pasa de tarjetas
-- de solo texto (ícono + nombre) a tarjetas con foto: la rutina de hoy
-- en Inicio, la agenda, y la vista previa de la rutina. Sin foto se cae
-- a un degradado con el ícono, así que la columna es opcional.

alter table public.routines add column image_path text;

comment on column public.routines.image_path is
  'Foto de portada de la rutina (bucket routine-images). Opcional — sin ella el cliente ve un degradado con ícono.';

insert into storage.buckets (id, name, public)
values ('routine-images', 'routine-images', true)
on conflict (id) do nothing;

-- Público para leer: la tarjeta del cliente carga la imagen por URL
-- pública, igual que ya hacen los logos de negocio y las fotos de
-- alimentos.
create policy routine_images_public_select on storage.objects
  for select using (bucket_id = 'routine-images');

create policy routine_images_trainer_manage_own on storage.objects
  for all to authenticated
  using (bucket_id = 'routine-images' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'routine-images' and (storage.foldername(name))[1] = auth.uid()::text);
