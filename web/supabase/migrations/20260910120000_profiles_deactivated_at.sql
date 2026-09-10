-- Fecha en que un cliente pasó a inactivo. El dashboard del entrenador
-- la muestra en la tarjeta de "Clientes inactivos" ("Inactivo desde:").
--
-- Se llena/limpia con un trigger en vez de tocar cada lugar del código
-- que cambia profiles.status (perfil del cliente, lista de clientes,
-- botón "Reactivar" del dashboard) — así cualquier cambio de estado,
-- ahora o a futuro, queda cubierto sin depender de que el llamador se
-- acuerde de setear la fecha.
alter table public.profiles add column if not exists deactivated_at timestamptz;

-- Backfill: los que ya están inactivos no tienen fecha registrada — se
-- usa "ahora" como aproximación (mejor que dejarlo vacío en la UI).
update public.profiles
set deactivated_at = now()
where status = 'inactive' and deactivated_at is null;

create or replace function public.set_deactivated_at()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'inactive' and old.status is distinct from 'inactive' then
    new.deactivated_at := now();
  elsif new.status is distinct from 'inactive' then
    new.deactivated_at := null;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_set_deactivated_at on public.profiles;
create trigger trg_set_deactivated_at
  before update of status on public.profiles
  for each row
  execute function public.set_deactivated_at();
