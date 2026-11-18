-- =====================================================================
-- FUTURO DIGITAL STUDIO — Entrega 5: Studio (Brandbook, Contas e Agenda)
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
  check (mode in ('ads','link','talking','hook','slideshow','motion','image-ad','remake','studio'));

create table if not exists public.studio_projects (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null references auth.users(id) on delete cascade,
  name                 text not null,
  niche                text not null default 'Geral',
  product_name         text not null default 'Meu Produto',
  is_active            boolean not null default true,
  brandbook            jsonb not null default '{}'::jsonb,
  auto_routine_enabled boolean not null default false,
  daily_target         integer not null default 2,
  created_at           timestamptz not null default now()
);

create index if not exists studio_projects_user_idx on public.studio_projects(user_id, created_at asc);

alter table public.studio_projects enable row level security;

drop policy if exists "studio_projects: gerenciar proprios" on public.studio_projects;
create policy "studio_projects: gerenciar proprios" on public.studio_projects
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists public.studio_accounts (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  project_id     uuid not null references public.studio_projects(id) on delete cascade,
  handle         text not null,
  platform       text not null default 'TikTok',
  stage          text not null default 'Criada',
  health_score   integer not null default 94,
  tiktok_shop    boolean not null default false,
  auto_warmup    boolean not null default true,
  avatar_url     text not null default '/showcase/modelo-01.webp',
  published_28d  integer not null default 0,
  created_at     timestamptz not null default now()
);

create index if not exists studio_accounts_user_idx on public.studio_accounts(user_id, created_at asc);

alter table public.studio_accounts enable row level security;

drop policy if exists "studio_accounts: gerenciar proprias" on public.studio_accounts;
create policy "studio_accounts: gerenciar proprias" on public.studio_accounts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists public.studio_posts (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  project_id       uuid not null references public.studio_projects(id) on delete cascade,
  account_id       uuid not null references public.studio_accounts(id) on delete cascade,
  video_project_id uuid references public.video_projects(id) on delete set null,
  title            text not null,
  caption_style    text not null default 'karaoke',
  trim_footer      boolean not null default false,
  normalize_voice  boolean not null default true,
  scheduled_for    timestamptz not null,
  status           text not null default 'scheduled' check (status in ('scheduled','ready','published')),
  thumbnail_url    text not null default '/showcase/modelo-01.webp',
  created_at       timestamptz not null default now()
);

create index if not exists studio_posts_user_idx on public.studio_posts(user_id, scheduled_for asc);

alter table public.studio_posts enable row level security;

drop policy if exists "studio_posts: gerenciar proprios" on public.studio_posts;
create policy "studio_posts: gerenciar proprios" on public.studio_posts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
