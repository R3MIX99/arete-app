-- Asignación de un plan de alimentación a un cliente, con fecha de
-- inicio. scale_factor guarda el ajuste proporcional de porciones que se
-- calculó al asignar (objetivo calórico del cliente ÷ objetivo del
-- plan), para que la Fase 9/10 pueda escalar las cantidades sin tener
-- que recalcularlo ni tocar la plantilla original.
create table public.diet_plan_assignments (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null references public.profiles (id) on delete cascade,
  client_id uuid not null references public.profiles (id) on delete cascade,
  diet_plan_id uuid not null references public.diet_plans (id) on delete cascade,
  start_date date not null,
  target_daily_calories numeric,
  scale_factor numeric not null default 1,
  created_at timestamptz not null default now(),
  constraint diet_plan_assignments_target_calories_positive check (
    target_daily_calories is null or target_daily_calories > 0
  ),
  constraint diet_plan_assignments_scale_factor_positive check (scale_factor > 0)
);

comment on table public.diet_plan_assignments is
  'Un plan de alimentación asignado a un cliente concreto, con la fecha de inicio y el factor de ajuste proporcional ya calculado (Fase 7). El calendario/plan del cliente (Fase 9/10) se arma a partir de esta tabla.';
comment on column public.diet_plan_assignments.scale_factor is
  'Factor por el que se multiplican las cantidades del plan al mostrárselas al cliente: target_daily_calories del cliente ÷ daily_calorie_target del plan. 1 si coinciden o no se ajustó.';

create index diet_plan_assignments_trainer_id_idx
  on public.diet_plan_assignments (trainer_id);
create index diet_plan_assignments_client_id_idx
  on public.diet_plan_assignments (client_id);
create index diet_plan_assignments_diet_plan_id_idx
  on public.diet_plan_assignments (diet_plan_id);

alter table public.diet_plan_assignments enable row level security;

create policy "diet_plan_assignments_select_own_as_trainer"
  on public.diet_plan_assignments for select
  using (trainer_id = auth.uid());

create policy "diet_plan_assignments_insert_own_as_trainer"
  on public.diet_plan_assignments for insert
  with check (
    trainer_id = auth.uid()
    and public.current_user_role() = 'trainer'
    and exists (
      select 1 from public.profiles c
      where c.id = diet_plan_assignments.client_id and c.trainer_id = auth.uid()
    )
    and exists (
      select 1 from public.diet_plans p
      where p.id = diet_plan_assignments.diet_plan_id and p.trainer_id = auth.uid()
    )
  );

create policy "diet_plan_assignments_delete_own"
  on public.diet_plan_assignments for delete
  using (trainer_id = auth.uid());

-- El cliente ve lo que le asignaron (para su propio panel, Fase 9/10).
create policy "diet_plan_assignments_select_own_as_client"
  on public.diet_plan_assignments for select
  using (client_id = auth.uid());

create policy "diet_plan_assignments_select_superadmin_sees_all"
  on public.diet_plan_assignments for select
  using (public.current_user_role() = 'superadmin');
