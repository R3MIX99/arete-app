-- Logo de negocio del entrenador (gimnasio o marca personal), opcional
-- — si no lo sube, se sigue mostrando el logo genérico de Areté donde
-- corresponda mostrarlo a sus clientes.
alter table public.profiles
  add column business_logo_path text;

comment on column public.profiles.business_logo_path is
  'Ruta dentro del bucket público "business-logos" al logo del gimnasio o marca personal del entrenador. Nulo = usar el logo genérico de Areté.';

grant update (business_name, business_logo_path, notify_email, notify_push)
  on public.profiles to authenticated;

-- Bucket público: el logo lo ven los clientes del entrenador (y en
-- general no es información sensible), así que no hace falta firmar
-- URLs para mostrarlo.
insert into storage.buckets (id, name, public)
values ('business-logos', 'business-logos', true)
on conflict (id) do nothing;

-- Convención de ruta: "{trainer_id}/{archivo}". Cualquiera puede leer
-- (bucket público); solo el propio entrenador puede escribir en su
-- carpeta.
create policy "business_logos_public_select"
  on storage.objects for select
  using (bucket_id = 'business-logos');

create policy "business_logos_trainer_manage_own"
  on storage.objects for all
  using (
    bucket_id = 'business-logos'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'business-logos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
