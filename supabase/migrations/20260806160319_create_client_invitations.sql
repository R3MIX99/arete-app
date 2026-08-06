-- Estructura de datos para que un entrenador invite clientes por correo.
-- Esta migración solo deja la tabla y sus políticas listas; el envío del
-- correo y la aceptación de la invitación se implementan en la Fase 5.
create table public.client_invitations (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null references public.profiles (id) on delete cascade,
  email text not null,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'expired', 'cancelled')),
  token uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  accepted_at timestamptz
);

comment on table public.client_invitations is
  'Invitación de un entrenador a un cliente por correo. Estructura lista desde la Fase 3; el envío del correo y el flujo de aceptación se implementan en la Fase 5.';
comment on column public.client_invitations.token is
  'Token opaco usado en el enlace de invitación. No se expone en ninguna política de lectura pública.';

create index client_invitations_trainer_id_idx on public.client_invitations (trainer_id);
create unique index client_invitations_token_idx on public.client_invitations (token);

alter table public.client_invitations enable row level security;

-- Un entrenador solo puede crear invitaciones a su propio nombre.
create policy "client_invitations_insert_own_as_trainer"
  on public.client_invitations for insert
  with check (
    trainer_id = auth.uid()
    and public.current_user_role() = 'trainer'
  );

-- Un entrenador ve y actualiza (p. ej. cancela) solo sus propias
-- invitaciones.
create policy "client_invitations_select_own"
  on public.client_invitations for select
  using (trainer_id = auth.uid());

create policy "client_invitations_update_own"
  on public.client_invitations for update
  using (trainer_id = auth.uid())
  with check (trainer_id = auth.uid());

-- El superadmin puede ver todas las invitaciones (soporte/auditoría).
create policy "client_invitations_select_superadmin_sees_all"
  on public.client_invitations for select
  using (public.current_user_role() = 'superadmin');
