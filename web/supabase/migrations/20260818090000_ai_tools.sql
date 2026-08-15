-- Fase 8: herramientas de IA para el entrenador (generar rutina/dieta,
-- puntaje de rutina).
--
-- public.routines ya tenía columnas ai_score / ai_score_summary /
-- ai_analyzed_at preparadas de antes para esto — se reutilizan tal cual,
-- no se duplican con nombres nuevos.

-- Límite de uso razonable por entrenador: cada Edge Function de IA
-- inserta una fila aquí al terminar con éxito, y antes de llamar a
-- Anthropic cuenta cuántas lleva en las últimas 24 horas.
create table public.ai_usage_events (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null references public.profiles(id) on delete cascade,
  feature text not null check (feature in ('generate_routine', 'generate_diet', 'score_routine')),
  created_at timestamptz not null default now()
);

alter table public.ai_usage_events enable row level security;

create policy ai_usage_events_select_own
  on public.ai_usage_events for select
  using (trainer_id = auth.uid());

create policy ai_usage_events_insert_own
  on public.ai_usage_events for insert
  with check (trainer_id = auth.uid());

create index ai_usage_events_trainer_created_idx
  on public.ai_usage_events (trainer_id, feature, created_at desc);
