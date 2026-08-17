-- Fase 12 — Panel de Superadministrador.
--
-- El superadmin ya podía leer profiles, routines, programs, asignaciones
-- y planes; le faltaba client_sessions, que es de donde sale toda la
-- actividad real de la plataforma (entrenamientos completados).
--
-- Es solo SELECT: el superadmin observa la plataforma, no edita los
-- datos de trabajo de los entrenadores. Y va por current_user_role(),
-- la función SECURITY DEFINER que ya existe, para no consultar profiles
-- dentro de una policy y provocar recursión.
create policy "client_sessions_select_superadmin_sees_all"
  on public.client_sessions for select
  to authenticated
  using (public.current_user_role() = 'superadmin');
