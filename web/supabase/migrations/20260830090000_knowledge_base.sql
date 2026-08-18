-- Fase 14: base de conocimiento para que la IA "aprenda" de contenido
-- experto (documentos, transcripciones de video, y rutinas/dietas
-- marcadas como referencia de alta calidad) y lo use como contexto
-- extra al generar rutinas, dietas, o evaluar una rutina.

create extension if not exists vector with schema extensions;

-- Una fila por FUENTE de conocimiento (un documento, un video, una
-- rutina o dieta marcada como referencia). El texto real, ya partido en
-- fragmentos con su embedding, vive en knowledge_chunks — una fuente
-- puede tener muchos fragmentos.
create table public.knowledge_sources (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  content_type text not null check (content_type in ('document', 'video', 'routine', 'diet')),
  -- null = aplica a cualquier objetivo, no solo a uno en particular.
  category public.client_goal,
  source_url text,
  storage_path text,
  -- Texto pegado a mano (documento o transcripción) — ver comentario en
  -- la Edge Function ingest-knowledge sobre por qué es la vía principal
  -- y no solo un respaldo.
  raw_text text,
  source_routine_id uuid references public.routines (id) on delete cascade,
  source_diet_plan_id uuid references public.diet_plans (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'processing', 'ready', 'error')),
  error_message text,
  is_active boolean not null default true,
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now()
);

comment on table public.knowledge_sources is
  'Fase 14: catálogo de contenido experto que alimenta la IA. Cada fila es una fuente (documento, video, o una rutina/dieta marcada como referencia); sus fragmentos con embedding viven en knowledge_chunks.';
comment on column public.knowledge_sources.category is
  'Objetivo al que aplica este contenido (mismo enum que el objetivo del cliente). Null = aplica en general.';
comment on column public.knowledge_sources.status is
  'pending: recién creada, falta procesar. processing: la Edge Function la está partiendo en fragmentos. ready: ya tiene fragmentos con embedding, disponible para la IA. error: falló el procesamiento (ver error_message).';

create table public.knowledge_chunks (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.knowledge_sources (id) on delete cascade,
  chunk_index integer not null default 0,
  content text not null,
  embedding vector(512),
  created_at timestamptz not null default now()
);

comment on table public.knowledge_chunks is
  'Fragmentos de una knowledge_source con su embedding — lo que de verdad se busca por similitud. embedding vector(512) = dimensión de voyage-3-lite, el modelo de embeddings que usan las Edge Functions.';

create index knowledge_chunks_source_id_idx on public.knowledge_chunks (source_id);
create index knowledge_chunks_embedding_idx on public.knowledge_chunks
  using hnsw (embedding vector_cosine_ops);

alter table public.knowledge_sources enable row level security;
alter table public.knowledge_chunks enable row level security;

-- Solo el superadmin administra la base de conocimiento.
create policy knowledge_sources_all_superadmin on public.knowledge_sources
  for all to authenticated
  using (current_user_role() = 'superadmin')
  with check (current_user_role() = 'superadmin');

create policy knowledge_chunks_all_superadmin on public.knowledge_chunks
  for all to authenticated
  using (current_user_role() = 'superadmin')
  with check (current_user_role() = 'superadmin');

-- Cualquier entrenador autenticado puede LEER las fuentes activas y
-- listas (no el contenido inactivo/con error) — es lo que necesitan las
-- Edge Functions de generación, que corren con la sesión del propio
-- entrenador, no con una llave de servicio.
create policy knowledge_sources_select_active on public.knowledge_sources
  for select to authenticated
  using (is_active and status = 'ready');

create policy knowledge_chunks_select_via_active_source on public.knowledge_chunks
  for select to authenticated
  using (
    exists (
      select 1 from public.knowledge_sources ks
      where ks.id = knowledge_chunks.source_id and ks.is_active and ks.status = 'ready'
    )
  );

-- Búsqueda por similitud vectorial, acotada al objetivo del cliente
-- cuando se indica (o a todo el contenido "general" con category null).
-- SECURITY DEFINER porque las Edge Functions la llaman con la sesión
-- del entrenador — la policy de select ya solo expone contenido activo
-- y listo, así que no hay nada sensible que se filtre de más.
create or replace function public.match_knowledge_chunks(
  query_embedding vector(512),
  match_category public.client_goal default null,
  match_count int default 4
)
returns table (title text, content text, similarity float)
language sql
stable
security definer
set search_path = public, extensions
as $$
  select ks.title, kc.content, 1 - (kc.embedding <=> query_embedding) as similarity
  from public.knowledge_chunks kc
  join public.knowledge_sources ks on ks.id = kc.source_id
  where ks.is_active
    and ks.status = 'ready'
    and (match_category is null or ks.category is null or ks.category = match_category)
  order by kc.embedding <=> query_embedding
  limit match_count;
$$;

comment on function public.match_knowledge_chunks is
  'Fase 14: top-N fragmentos más parecidos a query_embedding, acotados por objetivo si se da uno. Las Edge Functions de generación la llaman antes de armar el prompt para Claude.';

grant execute on function public.match_knowledge_chunks(vector, public.client_goal, int) to authenticated;

-- Bucket privado: el documento original solo lo ve el superadmin (o la
-- Edge Function con la llave de servicio) — a diferencia de las fotos
-- de ejercicios/alimentos, aquí no hay ninguna razón para que sea
-- público.
insert into storage.buckets (id, name, public)
values ('knowledge-documents', 'knowledge-documents', false)
on conflict (id) do nothing;

create policy knowledge_documents_superadmin_manage on storage.objects
  for all to authenticated
  using (bucket_id = 'knowledge-documents' and current_user_role() = 'superadmin')
  with check (bucket_id = 'knowledge-documents' and current_user_role() = 'superadmin');
