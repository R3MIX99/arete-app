-- Estas 3 funciones son solo para disparar como trigger (usan NEW/OLD
-- implícitos) — llamarlas directo por RPC fallaría igual, pero el
-- linter de seguridad las marca por estar expuestas. Se les quita el
-- EXECUTE público explícitamente.
revoke execute on function public.notify_client_assignment_change() from public, anon, authenticated;
revoke execute on function public.notify_assignment_override_change() from public, anon, authenticated;
revoke execute on function public.notify_diet_plan_assignment_change() from public, anon, authenticated;
