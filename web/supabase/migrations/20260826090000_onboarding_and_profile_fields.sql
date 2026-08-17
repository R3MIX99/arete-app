-- Registro y onboarding: campos que faltaban en profiles para poder
-- pedirlos al entrenador y al cliente la primera vez que entran.

create type public.gender as enum ('male', 'female', 'unspecified');
comment on type public.gender is
  'Masculino, femenino, o sin especificar — aplica igual a entrenadores y clientes.';

alter table public.profiles
  add column gender public.gender not null default 'unspecified',
  add column height_cm numeric check (height_cm > 0),
  add column weekly_training_frequency smallint check (weekly_training_frequency between 0 and 14),
  add column onboarding_completed_at timestamptz;

comment on column public.profiles.height_cm is
  'Estatura del cliente en centímetros. No aplica a entrenadores.';
comment on column public.profiles.weekly_training_frequency is
  'Cuántas veces por semana entrena el cliente, aprox. No aplica a entrenadores.';
comment on column public.profiles.onboarding_completed_at is
  'Cuándo el usuario terminó su onboarding (nombre, género, y lo propio de su rol). Null = todavía no lo hace, y el panel lo manda ahí antes de dejarlo pasar.';

-- Los grants por columna son los que de verdad limitan qué puede tocar
-- cada quien (RLS filtra filas, no columnas) — sin sumar estas, ni el
-- entrenador ni el cliente podían guardar su propio onboarding.
grant update (
  gender,
  height_cm,
  weekly_training_frequency,
  onboarding_completed_at
) on public.profiles to authenticated;

-- Las cuentas que ya existían nunca pasaron por este onboarding y no
-- deben quedar bloqueadas en su próximo login — se dan por completadas
-- desde su fecha de alta.
update public.profiles set onboarding_completed_at = created_at where onboarding_completed_at is null;
