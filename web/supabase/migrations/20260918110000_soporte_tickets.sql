-- Tickets de soporte: cualquiera (con o sin sesión) puede enviar uno desde la
-- página pública /soporte; solo el superadmin los ve y los gestiona.

create table public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid references public.profiles(id) on delete set null,
  name text not null check (char_length(name) between 1 and 120),
  email text not null check (char_length(email) between 3 and 200 and email like '%@%'),
  category text not null default 'otro'
    check (category in ('cuenta', 'eliminar_cuenta', 'pagos', 'error', 'sugerencia', 'otro')),
  subject text not null check (char_length(subject) between 1 and 160),
  message text not null check (char_length(message) between 1 and 4000),
  status text not null default 'open' check (status in ('open', 'in_progress', 'resolved')),
  admin_note text check (admin_note is null or char_length(admin_note) <= 2000),
  resolved_at timestamptz
);

create index support_tickets_status_created_idx on public.support_tickets (status, created_at desc);

alter table public.support_tickets enable row level security;

-- user_id solo puede ser el propio (o nulo): nadie puede hacerse pasar por
-- otra cuenta al mandar un ticket.
create policy support_tickets_insert_anyone on public.support_tickets
  for insert to anon, authenticated
  with check (user_id is null or user_id = auth.uid());

create policy support_tickets_select_superadmin on public.support_tickets
  for select to authenticated
  using (public.current_user_role() = 'superadmin');

create policy support_tickets_update_superadmin on public.support_tickets
  for update to authenticated
  using (public.current_user_role() = 'superadmin')
  with check (public.current_user_role() = 'superadmin');

grant insert on public.support_tickets to anon, authenticated;
grant select, update on public.support_tickets to authenticated;

-- Freno básico contra spam en el formulario público: máximo 5 tickets por
-- hora por correo.
create or replace function public.support_tickets_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- security definer: quien envía el formulario (anon) no puede leer la
  -- tabla por RLS, así que sin esto el conteo siempre daría 0.
  if (
    select count(*) from public.support_tickets
    where lower(email) = lower(new.email) and created_at > now() - interval '1 hour'
  ) >= 5 then
    raise exception 'Enviaste muchos mensajes seguidos. Intenta de nuevo en un rato.'
      using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger trg_support_tickets_rate_limit
  before insert on public.support_tickets
  for each row execute function public.support_tickets_rate_limit();
