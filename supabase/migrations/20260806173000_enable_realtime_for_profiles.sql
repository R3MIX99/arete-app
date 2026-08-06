-- La app usa .stream() sobre profiles (perfil en vivo del usuario actual y
-- refresco del router). Sin esto, la suscripción de Realtime falla con
-- RealtimeSubscribeException.
alter publication supabase_realtime add table public.profiles;
