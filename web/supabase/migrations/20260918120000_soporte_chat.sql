-- Chat de soporte entre entrenadores y el equipo de Aretia.
--
-- Cada ticket de support_tickets es una conversación. Los mensajes viven en
-- support_messages. Los tickets enviados sin sesión desde la página pública
-- (user_id nulo) tienen un solo mensaje y se responden por correo.

alter table public.support_tickets
  add column ticket_number bigint generated always as identity,
  add column last_message_at timestamptz not null default now(),
  add column trainer_unread integer not null default 0 check (trainer_unread >= 0),
  add column admin_unread integer not null default 0 check (admin_unread >= 0);

create table public.support_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.support_tickets(id) on delete cascade,
  author_id uuid references public.profiles(id) on delete set null,
  author_role text not null check (author_role in ('trainer', 'support')),
  body text not null check (char_length(body) between 1 and 4000),
  created_at timestamptz not null default now()
);

create index support_messages_ticket_created_idx on public.support_messages (ticket_id, created_at);

alter table public.support_messages enable row level security;

-- Cada entrenador ve sus propios tickets (además del superadmin).
create policy support_tickets_select_own on public.support_tickets
  for select to authenticated
  using (user_id = auth.uid());

create policy support_messages_select on public.support_messages
  for select to authenticated
  using (
    public.current_user_role() = 'superadmin'
    or exists (
      select 1 from public.support_tickets t
      where t.id = support_messages.ticket_id and t.user_id = auth.uid()
    )
  );

-- El entrenador solo escribe en sus tickets, como 'trainer' y a su nombre;
-- el superadmin escribe como 'support'. Los tickets sin cuenta no admiten
-- chat (no hay quién reciba la respuesta dentro de la app).
create policy support_messages_insert_trainer on public.support_messages
  for insert to authenticated
  with check (
    author_role = 'trainer'
    and author_id = auth.uid()
    and exists (
      select 1 from public.support_tickets t
      where t.id = ticket_id and t.user_id = auth.uid()
    )
  );

create policy support_messages_insert_support on public.support_messages
  for insert to authenticated
  with check (
    author_role = 'support'
    and author_id = auth.uid()
    and public.current_user_role() = 'superadmin'
    and exists (
      select 1 from public.support_tickets t
      where t.id = ticket_id and t.user_id is not null
    )
  );

grant select, insert on public.support_messages to authenticated;

-- Tickets que ya existían: su mensaje original pasa a ser el primer mensaje
-- de la conversación (antes de crear los triggers, para no contarlo dos veces).
insert into public.support_messages (ticket_id, author_id, author_role, body, created_at)
select id, user_id, 'trainer', message, created_at from public.support_tickets;

update public.support_tickets
set last_message_at = created_at,
    admin_unread = case when status = 'open' then 1 else 0 end;

-- El ticket nuevo trae su primer mensaje: se copia a la conversación.
create or replace function public.support_ticket_first_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.support_messages (ticket_id, author_id, author_role, body, created_at)
  values (new.id, new.user_id, 'trainer', new.message, new.created_at);
  return new;
end;
$$;

create trigger trg_support_ticket_first_message
  after insert on public.support_tickets
  for each row execute function public.support_ticket_first_message();

-- Cada mensaje nuevo: actualiza la conversación, cuenta los no leídos del
-- otro lado y ajusta el estado (soporte responde = en proceso; el
-- entrenador escribe en uno resuelto = se reabre).
create or replace function public.support_message_after_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.author_role = 'support' then
    update public.support_tickets
    set last_message_at = new.created_at,
        trainer_unread = trainer_unread + 1,
        status = case when status = 'open' then 'in_progress' else status end
    where id = new.ticket_id;
  else
    update public.support_tickets
    set last_message_at = new.created_at,
        -- El primer mensaje ya se cuenta como no leído por soporte.
        admin_unread = admin_unread + 1,
        status = case when status = 'resolved' then 'open' else status end,
        resolved_at = case when status = 'resolved' then null else resolved_at end
    where id = new.ticket_id;
  end if;
  return new;
end;
$$;

create trigger trg_support_message_after_insert
  after insert on public.support_messages
  for each row execute function public.support_message_after_insert();

-- Marca como leída la conversación para quien la abre.
create or replace function public.mark_support_ticket_read(p_ticket_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.current_user_role() = 'superadmin' then
    update public.support_tickets set admin_unread = 0 where id = p_ticket_id and admin_unread <> 0;
  else
    update public.support_tickets
    set trainer_unread = 0
    where id = p_ticket_id and user_id = auth.uid() and trainer_unread <> 0;
  end if;
end;
$$;

revoke all on function public.mark_support_ticket_read(uuid) from public;
grant execute on function public.mark_support_ticket_read(uuid) to authenticated;

-- Tiempo real: las conversaciones y los mensajes llegan sin recargar (las
-- políticas de arriba filtran qué ve cada quien).
alter publication supabase_realtime add table public.support_messages;
alter publication supabase_realtime add table public.support_tickets;
