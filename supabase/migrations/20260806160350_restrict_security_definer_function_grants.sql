-- handle_new_user solo debe ejecutarse como trigger de auth.users, nunca
-- invocarse directamente vía la API REST.
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- current_user_role() sí necesita ser ejecutable por "authenticated" (las
-- políticas de RLS de profiles y client_invitations la usan), pero no hay
-- razón para exponerla a "anon" (usuarios sin sesión).
revoke execute on function public.current_user_role() from public, anon;
grant execute on function public.current_user_role() to authenticated;
