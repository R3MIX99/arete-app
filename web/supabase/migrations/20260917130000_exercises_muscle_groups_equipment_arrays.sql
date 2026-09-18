-- Convierte exercises.muscle_group / exercises.equipment de columnas
-- únicas a arreglos, para poder seleccionar varios grupos musculares y
-- varias piezas de equipo por ejercicio.

alter table public.exercises add column muscle_groups public.exercise_muscle_group[] not null default '{}';
update public.exercises set muscle_groups = array[muscle_group];

alter table public.exercises add column equipment_items public.exercise_equipment[] not null default '{}';
update public.exercises set equipment_items = array[equipment];

alter table public.exercises drop column muscle_group;
alter table public.exercises drop column equipment;

alter table public.exercises add constraint exercises_muscle_groups_not_empty check (array_length(muscle_groups, 1) >= 1);
alter table public.exercises add constraint exercises_equipment_items_not_empty check (array_length(equipment_items, 1) >= 1);

drop index if exists public.exercises_muscle_group_idx;
drop index if exists public.exercises_equipment_idx;
create index exercises_muscle_groups_idx on public.exercises using gin (muscle_groups);
create index exercises_equipment_items_idx on public.exercises using gin (equipment_items);
