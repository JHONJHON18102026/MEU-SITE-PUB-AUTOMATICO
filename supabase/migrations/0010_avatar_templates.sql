-- Templates autorais vinculados à conta; o conteúdo funciona em todos os dispositivos do usuário.
create table if not exists public.avatar_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  mode text not null check (mode in ('image', 'video')),
  prompt text not null check (char_length(prompt) between 1 and 1200),
  skill_ids text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists avatar_templates_user_updated_idx
  on public.avatar_templates (user_id, updated_at desc);

alter table public.avatar_templates enable row level security;

drop policy if exists "templates avatar: ler os proprios" on public.avatar_templates;
create policy "templates avatar: ler os proprios" on public.avatar_templates
  for select using (auth.uid() = user_id);
drop policy if exists "templates avatar: criar os proprios" on public.avatar_templates;
create policy "templates avatar: criar os proprios" on public.avatar_templates
  for insert with check (auth.uid() = user_id);
drop policy if exists "templates avatar: editar os proprios" on public.avatar_templates;
create policy "templates avatar: editar os proprios" on public.avatar_templates
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "templates avatar: apagar os proprios" on public.avatar_templates;
create policy "templates avatar: apagar os proprios" on public.avatar_templates
  for delete using (auth.uid() = user_id);
