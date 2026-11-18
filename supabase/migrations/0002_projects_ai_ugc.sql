-- =====================================================================
-- FUTURO DIGITAL STUDIO — Entrega 2: Projetos de vídeo & AI UGC
-- Cole no Supabase > SQL Editor > Run (ou rode: npm run db:setup).
-- Seguro para rodar mais de uma vez (idempotente).
-- =====================================================================

create table if not exists public.video_projects (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  generation_id     uuid references public.generations(id) on delete set null,
  mode              text not null check (mode in ('ads','link','talking')),
  title             text not null default 'Projeto AI UGC',
  status            text not null default 'processing' check (status in ('processing','done','failed')),
  engine            text not null default 'veo-3.1-fast',
  aspect_ratio      text not null default '9:16',
  duration_seconds  integer not null default 8,
  scene_count       integer not null default 1,
  cost              integer not null default 0,
  refunded          integer not null default 0,
  thumbnail_url     text not null default '',
  video_url         text,
  storage_path      text,
  scenes            jsonb not null default '[]'::jsonb,
  params            jsonb not null default '{}'::jsonb,
  error             text,
  created_at        timestamptz not null default now(),
  completed_at      timestamptz,
  expires_at        timestamptz not null default (now() + interval '14 days')
);

create index if not exists video_projects_user_idx on public.video_projects(user_id, created_at desc);

alter table public.video_projects enable row level security;

drop policy if exists "projetos: ler os proprios" on public.video_projects;
create policy "projetos: ler os proprios" on public.video_projects
  for select using (auth.uid() = user_id);

drop policy if exists "projetos: apagar os proprios" on public.video_projects;
create policy "projetos: apagar os proprios" on public.video_projects
  for delete using (auth.uid() = user_id);

-- Bucket público de vídeos renderizados (leitura direta no player / download).
insert into storage.buckets (id, name, public)
values ('videos', 'videos', true)
on conflict (id) do update set public = true;

drop policy if exists "storage videos: leitura publica" on storage.objects;
create policy "storage videos: leitura publica" on storage.objects
  for select using (bucket_id = 'videos');
