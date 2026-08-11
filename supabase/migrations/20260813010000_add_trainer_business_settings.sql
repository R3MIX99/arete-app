-- Campos de configuración del entrenador: información de negocio,
-- preferencias de notificaciones y estado del plan de suscripción (solo
-- lectura por ahora; la lógica de pago se conecta en la Fase 15).
alter table public.profiles
  add column business_name text,
  add column notify_email boolean not null default true,
  add column notify_push boolean not null default true,
  add column subscription_plan text not null default 'free'
    check (subscription_plan in ('free', 'pro', 'studio')),
  add column subscription_status text not null default 'active'
    check (subscription_status in ('active', 'trialing', 'past_due', 'canceled'));

comment on column public.profiles.business_name is
  'Nombre del gimnasio o marca personal del entrenador. Solo aplica cuando role = trainer.';
comment on column public.profiles.subscription_plan is
  'Plan de suscripción del entrenador. Fase 6 (esta): solo visualización. Fase 15: se conecta la lógica de pago real.';
comment on column public.profiles.subscription_status is
  'Estado del plan de suscripción. Fase 6 (esta): solo visualización. Fase 15: se conecta la lógica de pago real.';

-- El propio entrenador ya puede actualizar su fila (profiles_update_own),
-- pero esa política no alcanza las columnas: profiles ya tiene una lista
-- explícita de columnas permitidas por GRANT (ver
-- 20260811010340_add_client_fields_and_trainer_management.sql). Hay que
-- sumar las nuevas a esa lista o el update las ignora en silencio.
--
-- subscription_plan y subscription_status quedan afuera a propósito:
-- nadie puede autoasignarse un plan pago haciendo un PATCH directo a su
-- propio perfil. Esas dos columnas solo las va a poder tocar la lógica
-- de pago (o un superadmin) cuando se conecte en la Fase 15.
grant update (
  business_name, notify_email, notify_push
) on public.profiles to authenticated;
