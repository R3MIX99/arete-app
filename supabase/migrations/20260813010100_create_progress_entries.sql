-- Registro de progreso de un cliente: peso, medidas y una foto opcional.
-- Un cliente puede tener muchos registros a lo largo del tiempo; las
-- gráficas del panel de entrenador se arman ordenando por entry_date.
create table public.progress_entries (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles (id) on delete cascade,
  trainer_id uuid not null references public.profiles (id) on delete cascade,
  entry_date date not null default current_date,
  weight_kg numeric,
  chest_cm numeric,
  waist_cm numeric,
  hip_cm numeric,
  arm_cm numeric,
  thigh_cm numeric,
  -- Ruta dentro del bucket "progress-photos" (bucket privado), no una URL
  -- pública: se resuelve a una URL firmada al mostrarla, así una foto de
  -- progreso nunca queda accesible sin autenticación.
  photo_path text,
  notes text,
  created_at timestamptz not null default now(),
  constraint progress_entries_values_positive check (
    (weight_kg is null or weight_kg > 0)
    and (chest_cm is null or chest_cm > 0)
    and (waist_cm is null or waist_cm > 0)
    and (hip_cm is null or hip_cm > 0)
    and (arm_cm is null or arm_cm > 0)
    and (thigh_cm is null or thigh_cm > 0)
  )
);

comment on table public.progress_entries is
  'Un registro de peso/medidas/foto de un cliente en una fecha dada, para las gráficas de seguimiento de progreso.';

create index progress_entries_client_id_idx on public.progress_entries (client_id);
create index progress_entries_trainer_id_idx on public.progress_entries (trainer_id);
create index progress_entries_entry_date_idx on public.progress_entries (entry_date);

alter table public.progress_entries enable row level security;

create policy "progress_entries_select_own_as_trainer"
  on public.progress_entries for select
  using (trainer_id = auth.uid());

create policy "progress_entries_insert_own_as_trainer"
  on public.progress_entries for insert
  with check (
    trainer_id = auth.uid()
    and public.current_user_role() = 'trainer'
    and exists (
      select 1 from public.profiles c
      where c.id = progress_entries.client_id and c.trainer_id = auth.uid()
    )
  );

create policy "progress_entries_update_own"
  on public.progress_entries for update
  using (trainer_id = auth.uid())
  with check (trainer_id = auth.uid());

create policy "progress_entries_delete_own"
  on public.progress_entries for delete
  using (trainer_id = auth.uid());

-- El cliente ve y puede registrar lo suyo (para cuando exista su propio
-- panel de seguimiento).
create policy "progress_entries_select_own_as_client"
  on public.progress_entries for select
  using (client_id = auth.uid());

create policy "progress_entries_insert_own_as_client"
  on public.progress_entries for insert
  with check (
    client_id = auth.uid()
    and public.current_user_role() = 'client'
    and exists (
      select 1 from public.profiles t
      where t.id = progress_entries.trainer_id and t.id = (
        select trainer_id from public.profiles where id = auth.uid()
      )
    )
  );

create policy "progress_entries_select_superadmin_sees_all"
  on public.progress_entries for select
  using (public.current_user_role() = 'superadmin');

-- Bucket privado para las fotos de progreso. Nunca público: se accede
-- siempre con una URL firmada de corta duración.
insert into storage.buckets (id, name, public)
values ('progress-photos', 'progress-photos', false)
on conflict (id) do nothing;

-- Convención de ruta: "{client_id}/{archivo}". La política valida que el
-- primer segmento de la ruta sea un cliente de este entrenador (o el
-- propio cliente).
create policy "progress_photos_trainer_manage"
  on storage.objects for all
  using (
    bucket_id = 'progress-photos'
    and exists (
      select 1 from public.profiles c
      where c.id::text = (storage.foldername(name))[1]
        and c.trainer_id = auth.uid()
    )
  )
  with check (
    bucket_id = 'progress-photos'
    and exists (
      select 1 from public.profiles c
      where c.id::text = (storage.foldername(name))[1]
        and c.trainer_id = auth.uid()
    )
  );

create policy "progress_photos_client_select_own"
  on storage.objects for select
  using (
    bucket_id = 'progress-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
