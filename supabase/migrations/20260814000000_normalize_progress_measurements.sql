-- Cada medida (peso, pecho, cintura, ...) pasa a ser su propia fila
-- independiente, en vez de una columna dentro de una sola fila por
-- fecha. Así, eliminar una medida (p. ej. pecho) ya no borra las demás
-- medidas registradas ese mismo día (p. ej. peso).
create table public.progress_measurements (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles (id) on delete cascade,
  trainer_id uuid not null references public.profiles (id) on delete cascade,
  entry_date date not null default current_date,
  metric_key text not null check (
    metric_key in (
      'weight_kg', 'chest_cm', 'waist_cm', 'hip_cm', 'arm_cm', 'thigh_cm',
      'neck_cm', 'shoulder_cm', 'calf_cm', 'forearm_cm'
    )
  ),
  value numeric not null check (value > 0),
  notes text,
  created_at timestamptz not null default now()
);

comment on table public.progress_measurements is
  'Una medida individual (peso, pecho, cintura, etc.) de un cliente en una fecha dada — cada fila es independiente, para poder editar/eliminar una sin afectar las demás medidas del mismo día.';

create index progress_measurements_client_id_idx on public.progress_measurements (client_id);
create index progress_measurements_trainer_id_idx on public.progress_measurements (trainer_id);
create index progress_measurements_entry_date_idx on public.progress_measurements (entry_date);
create index progress_measurements_metric_key_idx on public.progress_measurements (metric_key);

alter table public.progress_measurements enable row level security;

create policy "progress_measurements_select_own_as_trainer"
  on public.progress_measurements for select
  using (trainer_id = auth.uid());

create policy "progress_measurements_insert_own_as_trainer"
  on public.progress_measurements for insert
  with check (
    trainer_id = auth.uid()
    and public.current_user_role() = 'trainer'
    and exists (
      select 1 from public.profiles c
      where c.id = progress_measurements.client_id and c.trainer_id = auth.uid()
    )
  );

create policy "progress_measurements_update_own"
  on public.progress_measurements for update
  using (trainer_id = auth.uid())
  with check (trainer_id = auth.uid());

create policy "progress_measurements_delete_own"
  on public.progress_measurements for delete
  using (trainer_id = auth.uid());

create policy "progress_measurements_select_own_as_client"
  on public.progress_measurements for select
  using (client_id = auth.uid());

create policy "progress_measurements_insert_own_as_client"
  on public.progress_measurements for insert
  with check (
    client_id = auth.uid()
    and public.current_user_role() = 'client'
    and exists (
      select 1 from public.profiles t
      where t.id = progress_measurements.trainer_id and t.id = (
        select trainer_id from public.profiles where id = auth.uid()
      )
    )
  );

create policy "progress_measurements_select_superadmin_sees_all"
  on public.progress_measurements for select
  using (public.current_user_role() = 'superadmin');

-- Migrar los datos existentes: una fila por columna de medida no nula.
insert into public.progress_measurements (client_id, trainer_id, entry_date, metric_key, value, notes, created_at)
select client_id, trainer_id, entry_date, 'weight_kg', weight_kg, notes, created_at
from public.progress_entries where weight_kg is not null
union all
select client_id, trainer_id, entry_date, 'chest_cm', chest_cm, notes, created_at
from public.progress_entries where chest_cm is not null
union all
select client_id, trainer_id, entry_date, 'waist_cm', waist_cm, notes, created_at
from public.progress_entries where waist_cm is not null
union all
select client_id, trainer_id, entry_date, 'hip_cm', hip_cm, notes, created_at
from public.progress_entries where hip_cm is not null
union all
select client_id, trainer_id, entry_date, 'arm_cm', arm_cm, notes, created_at
from public.progress_entries where arm_cm is not null
union all
select client_id, trainer_id, entry_date, 'thigh_cm', thigh_cm, notes, created_at
from public.progress_entries where thigh_cm is not null
union all
select client_id, trainer_id, entry_date, 'neck_cm', neck_cm, notes, created_at
from public.progress_entries where neck_cm is not null
union all
select client_id, trainer_id, entry_date, 'shoulder_cm', shoulder_cm, notes, created_at
from public.progress_entries where shoulder_cm is not null
union all
select client_id, trainer_id, entry_date, 'calf_cm', calf_cm, notes, created_at
from public.progress_entries where calf_cm is not null
union all
select client_id, trainer_id, entry_date, 'forearm_cm', forearm_cm, notes, created_at
from public.progress_entries where forearm_cm is not null;

-- progress_entries se queda solo con lo que sí es por-día compartido
-- (foto y notas generales) — las medidas viven en la tabla nueva.
alter table public.progress_entries
  drop constraint progress_entries_values_positive,
  drop column weight_kg,
  drop column chest_cm,
  drop column waist_cm,
  drop column hip_cm,
  drop column arm_cm,
  drop column thigh_cm,
  drop column neck_cm,
  drop column shoulder_cm,
  drop column calf_cm,
  drop column forearm_cm;
