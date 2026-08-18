-- Notificaciones del cliente: avisos cortos de cosas que le cambiaron
-- (rutina reasignada/ajustada, plan nutricional asignado/actualizado).
-- Se llenan solas vía triggers SECURITY DEFINER sobre las tablas de
-- asignación — así funciona sin importar desde qué pantalla del panel
-- de entrenador se hizo el cambio, no hace falta tocar cada flujo.

create table public.client_notifications (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles(id) on delete cascade,
  type text not null,
  title text not null,
  body text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index client_notifications_client_id_created_at_idx
  on public.client_notifications (client_id, created_at desc);

alter table public.client_notifications enable row level security;

-- El cliente solo ve y marca como leídas las suyas. No hay policy de
-- insert/delete para clientes ni entrenadores: todo lo crean los
-- triggers de abajo, que corren SECURITY DEFINER y así no dependen de
-- que quien dispara el trigger (el entrenador) tenga permiso directo
-- sobre esta tabla.
create policy "client_notifications_select_own"
  on public.client_notifications for select
  using (client_id = auth.uid());

create policy "client_notifications_update_own"
  on public.client_notifications for update
  using (client_id = auth.uid())
  with check (client_id = auth.uid());

-- Rutina o programa asignado/reasignado en client_assignments.
create or replace function public.notify_client_assignment_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_routine_name text;
  v_program_name text;
  v_is_update boolean := (tg_op = 'UPDATE');
begin
  if v_is_update and new.routine_id is not distinct from old.routine_id
     and new.program_id is not distinct from old.program_id then
    return new;
  end if;

  if new.routine_id is not null then
    select name into v_routine_name from public.routines where id = new.routine_id;
    if v_routine_name is not null then
      insert into public.client_notifications (client_id, type, title, body)
      values (
        new.client_id,
        'routine_assigned',
        case when v_is_update then 'Te cambiaron la rutina' else 'Nueva rutina asignada' end,
        'Tu entrenador te asignó la rutina "' || v_routine_name || '".'
      );
    end if;
  elsif new.program_id is not null then
    select name into v_program_name from public.programs where id = new.program_id;
    if v_program_name is not null then
      insert into public.client_notifications (client_id, type, title, body)
      values (
        new.client_id,
        'program_assigned',
        case when v_is_update then 'Te cambiaron el programa' else 'Nuevo programa asignado' end,
        'Tu entrenador te asignó el programa "' || v_program_name || '".'
      );
    end if;
  end if;

  return new;
end;
$$;

create trigger client_assignments_notify
  after insert or update of routine_id, program_id on public.client_assignments
  for each row execute function public.notify_client_assignment_change();

-- Ajuste puntual de un día del programa (assignment_overrides): se
-- reemplazó la rutina de ese día en particular.
create or replace function public.notify_assignment_override_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_client_id uuid;
  v_routine_name text;
begin
  if tg_op = 'UPDATE' and new.routine_id is not distinct from old.routine_id then
    return new;
  end if;

  select client_id into v_client_id from public.client_assignments where id = new.assignment_id;
  if v_client_id is null then
    return new;
  end if;

  select name into v_routine_name from public.routines where id = new.routine_id;
  if v_routine_name is not null then
    insert into public.client_notifications (client_id, type, title, body)
    values (
      v_client_id,
      'routine_changed',
      'Te cambiaron la rutina',
      'Tu entrenador ajustó tu rutina de hoy a "' || v_routine_name || '".'
    );
  end if;

  return new;
end;
$$;

create trigger assignment_overrides_notify
  after insert or update of routine_id on public.assignment_overrides
  for each row execute function public.notify_assignment_override_change();

-- Plan nutricional asignado o cambiado.
create or replace function public.notify_diet_plan_assignment_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_plan_name text;
  v_is_update boolean := (tg_op = 'UPDATE');
begin
  if v_is_update and new.diet_plan_id is not distinct from old.diet_plan_id then
    return new;
  end if;

  select name into v_plan_name from public.diet_plans where id = new.diet_plan_id;
  if v_plan_name is not null then
    insert into public.client_notifications (client_id, type, title, body)
    values (
      new.client_id,
      case when v_is_update then 'diet_changed' else 'diet_assigned' end,
      case when v_is_update then 'Te actualizaron tu plan nutricional' else 'Nuevo plan nutricional' end,
      'Tu entrenador te asignó el plan "' || v_plan_name || '".'
    );
  end if;

  return new;
end;
$$;

create trigger diet_plan_assignments_notify
  after insert or update of diet_plan_id on public.diet_plan_assignments
  for each row execute function public.notify_diet_plan_assignment_change();
