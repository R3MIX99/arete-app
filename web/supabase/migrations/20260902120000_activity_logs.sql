-- Fase 14 — Bitácora de actividad para el panel de superadministrador.
--
-- Una tabla de eventos genérica (no una tabla por tipo de acción):
-- login/logout, cambios de estatus de cliente, reseteos de contraseña,
-- errores puntuales, etc. — todo con la misma forma, para poder
-- filtrarlo y mostrarlo en una sola pantalla estilo "Logs" de Vercel.
--
-- Los datos del actor (rol, nombre, correo) se guardan como foto del
-- momento en vez de solo el id: si luego el actor cambia de nombre, de
-- rol, o hasta se borra la cuenta, el log sigue leyéndose igual — es
-- una bitácora, no debe reescribirse con el presente.
create table public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),

  actor_id uuid references public.profiles (id) on delete set null,
  -- 'client' | 'trainer' | 'superadmin' | 'anon' (sin sesión — p. ej.
  -- un intento de login fallido).
  actor_role text not null default 'anon',
  actor_name text,
  actor_email text,

  -- Slug estable en código, ej. 'auth.login', 'trainer.client_deactivated'.
  action text not null,
  -- 'auth' | 'trainer' | 'client' | 'superadmin' | 'system'.
  category text not null,
  -- 'info' | 'success' | 'warning' | 'error' | 'critical' — para poder
  -- ordenar "de lo más crítico a lo correcto" sin adivinar por texto.
  severity text not null default 'info'
    check (severity in ('info', 'success', 'warning', 'error', 'critical')),
  -- Resumen en español, ya listo para mostrarse en la fila de la tabla.
  message text not null,

  -- A quién/qué afectó la acción (opcional) — p. ej. target_type
  -- 'profile', target_id el id del cliente desactivado, target_label su
  -- nombre (también como foto del momento).
  target_type text,
  target_id uuid,
  target_label text,

  -- Todo lo demás: en qué pantalla/flujo estaba, a qué le hizo clic,
  -- el motivo de un error, código de estatus, etc. Forma libre a
  -- propósito — cada acción guarda lo que tenga sentido para ella.
  context jsonb not null default '{}'::jsonb
);

comment on table public.activity_logs is
  'Bitácora de actividad de toda la plataforma, para el panel de superadministrador (/superadmin/logs). Se escribe solo a través de la función log_activity(); nadie inserta directo a la tabla.';

create index activity_logs_created_at_idx on public.activity_logs (created_at desc);
create index activity_logs_actor_id_idx on public.activity_logs (actor_id);
create index activity_logs_category_idx on public.activity_logs (category);
create index activity_logs_severity_idx on public.activity_logs (severity);

alter table public.activity_logs enable row level security;

-- Solo lectura, y solo el superadmin — es quien vigila la plataforma
-- completa. Nadie tiene policy de INSERT: toda escritura pasa por
-- log_activity() (SECURITY DEFINER), así ningún cliente puede
-- inventarse un log a nombre de otro actor.
create policy "activity_logs_select_superadmin"
  on public.activity_logs for select
  to authenticated
  using (public.current_user_role() = 'superadmin');

-- Único camino para escribir un log. Toma el actor de auth.uid() (o
-- 'anon' si no hay sesión, p. ej. un login fallido) en vez de recibirlo
-- como parámetro — así no se puede loguear una acción a nombre de otra
-- persona desde el navegador.
create or replace function public.log_activity(
  p_action text,
  p_category text,
  p_severity text default 'info',
  p_message text default '',
  p_target_type text default null,
  p_target_id uuid default null,
  p_target_label text default null,
  p_context jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_actor_id uuid := auth.uid();
  v_actor_role public.user_role;
  v_actor_name text;
  v_actor_email text;
begin
  if v_actor_id is not null then
    select role, full_name, email
      into v_actor_role, v_actor_name, v_actor_email
    from public.profiles
    where id = v_actor_id;
  end if;

  insert into public.activity_logs (
    actor_id, actor_role, actor_name, actor_email,
    action, category, severity, message,
    target_type, target_id, target_label, context
  ) values (
    v_actor_id, coalesce(v_actor_role::text, 'anon'), v_actor_name, v_actor_email,
    p_action, p_category, coalesce(p_severity, 'info'), coalesce(p_message, ''),
    p_target_type, p_target_id, p_target_label, coalesce(p_context, '{}'::jsonb)
  )
  returning id into v_id;

  return v_id;
end;
$$;

comment on function public.log_activity is
  'Único camino para escribir en activity_logs. El actor sale de auth.uid() (nunca de un parámetro), así nadie puede loguear una acción a nombre de otra persona. Callable sin sesión (anon) para eventos como un login fallido.';

-- anon también: hay eventos sin sesión todavía (login fallido, registro
-- que aún no confirma correo).
grant execute on function public.log_activity(text, text, text, text, text, uuid, text, jsonb)
  to authenticated, anon;
