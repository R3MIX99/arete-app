-- Rol de usuario: superadmin (creado solo a mano en Supabase), entrenador
-- y cliente.
create type public.user_role as enum ('superadmin', 'trainer', 'client');

-- Perfil de cada usuario autenticado. id referencia 1:1 a auth.users.
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  email text not null,
  role public.user_role not null default 'client',
  avatar_url text,
  trainer_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint profiles_trainer_id_only_for_clients check (
    role = 'client' or trainer_id is null
  )
);

comment on table public.profiles is
  'Perfil de cada usuario autenticado (superadmin, entrenador o cliente). Se crea automáticamente al registrarse vía el trigger handle_new_user.';
comment on column public.profiles.trainer_id is
  'Entrenador asignado a este cliente. Solo aplica cuando role = client.';

create index profiles_trainer_id_idx on public.profiles (trainer_id);

-- Función auxiliar (SECURITY DEFINER) para leer el rol del usuario actual
-- sin provocar recursión infinita en las políticas de RLS de esta misma
-- tabla.
create function public.current_user_role()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

comment on function public.current_user_role() is
  'Rol del usuario autenticado actual. SECURITY DEFINER para poder usarse dentro de políticas RLS de profiles sin recursión.';

-- Crea el perfil automáticamente al registrarse, usando la metadata pasada
-- en supabase.auth.signUp (full_name, role, trainer_id). El rol
-- "superadmin" nunca puede llegar por este camino: si se solicita, se
-- fuerza a "client". El superadmin se crea manualmente desde Supabase.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_role public.user_role;
begin
  begin
    requested_role := coalesce(
      (new.raw_user_meta_data ->> 'role')::public.user_role,
      'client'
    );
  exception when others then
    requested_role := 'client';
  end;

  if requested_role = 'superadmin' then
    requested_role := 'client';
  end if;

  insert into public.profiles (id, full_name, email, role, trainer_id)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    new.email,
    requested_role,
    case
      when requested_role = 'client'
        then nullif(new.raw_user_meta_data ->> 'trainer_id', '')::uuid
      else null
    end
  );

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Row Level Security.
alter table public.profiles enable row level security;

create policy "profiles_select_own"
  on public.profiles for select
  using (id = auth.uid());

create policy "profiles_update_own"
  on public.profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());

create policy "profiles_select_trainer_sees_clients"
  on public.profiles for select
  using (trainer_id = auth.uid());

create policy "profiles_select_superadmin_sees_all"
  on public.profiles for select
  using (public.current_user_role() = 'superadmin');
