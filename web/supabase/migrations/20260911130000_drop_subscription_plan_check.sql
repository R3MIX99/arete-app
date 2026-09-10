-- La Fase A agregó el plan 'gym' al catálogo public.plans, pero profiles
-- todavía tenía un CHECK viejo que solo aceptaba ('free','pro','studio') en
-- subscription_plan — por eso subir un entrenador a Gym daba error de
-- constraint. Se elimina ese CHECK: el catálogo real de planes es
-- public.plans y la validación correcta es el FK profiles.subscription_plan
-- -> plans.key (que ya existe). Así, agregar un plan nuevo al catálogo no
-- vuelve a requerir tocar este constraint.
alter table public.profiles drop constraint if exists profiles_subscription_plan_check;
