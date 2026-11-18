-- =====================================================================
-- FUTURO DIGITAL STUDIO — Entrega 4: Biblioteca VIRAL e Remake Viral
-- Cole no Supabase > SQL Editor > Run (idempotente).
-- =====================================================================

do $$
declare
  cname text;
begin
  for cname in
    select conname
    from pg_constraint
    where conrelid = 'public.video_projects'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) like '%mode%'
  loop
    execute format('alter table public.video_projects drop constraint %I', cname);
  end loop;
end $$;

alter table public.video_projects
  add constraint video_projects_mode_check
  check (mode in ('ads','link','talking','hook','slideshow','motion','image-ad','remake'));

create table if not exists public.viral_folders (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  formats     jsonb not null default '["Remake Viral"]'::jsonb,
  created_at  timestamptz not null default now()
);

create index if not exists viral_folders_user_idx on public.viral_folders(user_id, created_at asc);

alter table public.viral_folders enable row level security;

drop policy if exists "viral_folders: ler proprias" on public.viral_folders;
create policy "viral_folders: ler proprias" on public.viral_folders
  for select using (auth.uid() = user_id);

drop policy if exists "viral_folders: gerenciar proprias" on public.viral_folders;
create policy "viral_folders: gerenciar proprias" on public.viral_folders
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists public.viral_items (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  folder_id      uuid not null references public.viral_folders(id) on delete cascade,
  title          text not null,
  source_url     text,
  platform       text not null default 'TikTok',
  thumbnail_url  text not null default '/showcase/modelo-01.webp',
  niche          text not null default 'Geral',
  viral_score    integer not null default 88,
  duration_sec   integer not null default 15,
  manifest       jsonb,
  created_at     timestamptz not null default now()
);

create index if not exists viral_items_folder_idx on public.viral_items(folder_id, created_at desc);

alter table public.viral_items enable row level security;

drop policy if exists "viral_items: gerenciar proprios" on public.viral_items;
create policy "viral_items: gerenciar proprios" on public.viral_items
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
