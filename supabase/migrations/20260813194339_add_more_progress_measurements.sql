-- Se amplían las medidas corporales de progress_entries de 5 a 9 (más
-- el peso), para acercarse a las ~10 partes corporales que un
-- entrenador mide en cada seguimiento mensual.
alter table public.progress_entries
  add column neck_cm numeric,
  add column shoulder_cm numeric,
  add column calf_cm numeric,
  add column forearm_cm numeric;

alter table public.progress_entries
  drop constraint progress_entries_values_positive;

alter table public.progress_entries
  add constraint progress_entries_values_positive check (
    (weight_kg is null or weight_kg > 0)
    and (chest_cm is null or chest_cm > 0)
    and (waist_cm is null or waist_cm > 0)
    and (hip_cm is null or hip_cm > 0)
    and (arm_cm is null or arm_cm > 0)
    and (thigh_cm is null or thigh_cm > 0)
    and (neck_cm is null or neck_cm > 0)
    and (shoulder_cm is null or shoulder_cm > 0)
    and (calf_cm is null or calf_cm > 0)
    and (forearm_cm is null or forearm_cm > 0)
  );

comment on column public.progress_entries.neck_cm is 'Circunferencia de cuello en cm.';
comment on column public.progress_entries.shoulder_cm is 'Circunferencia/ancho de hombros en cm.';
comment on column public.progress_entries.calf_cm is 'Circunferencia de pantorrilla en cm.';
comment on column public.progress_entries.forearm_cm is 'Circunferencia de antebrazo en cm.';
