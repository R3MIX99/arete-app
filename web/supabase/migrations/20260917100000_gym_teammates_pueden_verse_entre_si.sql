-- Bug encontrado probando el banner "su nutrición la maneja X": un
-- entrenador normal (no admin/supervisor) no tenía ninguna política de
-- RLS que le dejara leer el profile de OTRO empleado del mismo
-- gimnasio — solo podía leer el suyo propio, el de sus clientes
-- (can_manage_client), o el del nutriólogo que le manda si él mismo es
-- cliente de alguien. Así que el join `nutritionist:nutritionist_id
-- (full_name)` en la lista de clientes le devolvía null para el nombre
-- de un compañero, y el banner caía de vuelta al nombre del entrenador
-- en lugar de mostrar al nutriólogo real.
--
-- Se agrega una política nueva: cualquier miembro activo del gimnasio
-- puede ver los profiles de sus COMPAÑEROS empleados (role='trainer')
-- del mismo gimnasio — nunca los de otros clientes, que siguen
-- rigiéndose por can_manage_client()/nutritionist_id (D3: "solo
-- suyos"). Ver el nombre de un compañero de equipo no es información
-- sensible; no tener esto ya rompía cualquier pantalla que necesitara
-- mostrar "a cargo de: <nombre del compañero>".

create policy profiles_select_gym_teammates on public.profiles
  for select to authenticated
  using (
    role = 'trainer'
    and gym_id is not null
    and exists (
      select 1 from public.gym_members me
      where me.profile_id = auth.uid()
        and me.status = 'active'
        and me.gym_id = profiles.gym_id
    )
  );
