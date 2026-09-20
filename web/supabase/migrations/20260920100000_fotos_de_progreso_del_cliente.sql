-- Fotos de progreso subidas por el propio cliente.
--
-- Hasta ahora solo el entrenador podía subir al bucket privado
-- `progress-photos` (política progress_photos_trainer_manage). Ahora el
-- cliente sube las suyas a su carpeta (<client_id>/...), y tanto él como su
-- entrenador pueden eliminarlas.

-- El cliente sube únicamente dentro de su propia carpeta.
drop policy if exists progress_photos_client_insert_own on storage.objects;
create policy progress_photos_client_insert_own on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'progress-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- El cliente elimina sus propias entradas de foto (el entrenador ya podía
-- con progress_entries_delete_own; el de gimnasio se cubre con
-- can_manage_client).
drop policy if exists progress_entries_delete_own_as_client on public.progress_entries;
create policy progress_entries_delete_own_as_client on public.progress_entries
  for delete to authenticated
  using (client_id = auth.uid());

drop policy if exists progress_entries_delete_as_manager on public.progress_entries;
create policy progress_entries_delete_as_manager on public.progress_entries
  for delete to authenticated
  using (public.can_manage_client(client_id));

-- La app siempre sube JPEG ya recortado y comprimido; el límite evita que
-- alguien llene el almacenamiento saltándose la interfaz.
update storage.buckets
   set file_size_limit = 8 * 1024 * 1024,
       allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
 where id = 'progress-photos';
