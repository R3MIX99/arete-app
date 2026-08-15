-- Solo se pueden asignar programas a un cliente, no rutinas sueltas
-- (esa opción nunca tuvo una pantalla real para usarla y generaba
-- confusión: aparecía en el calendario/clientes sin forma de verla o
-- quitarla desde la interfaz).
alter table public.client_assignments drop constraint client_assignments_program_xor_routine;
alter table public.client_assignments add constraint client_assignments_program_required
  check (program_id is not null and routine_id is null);
