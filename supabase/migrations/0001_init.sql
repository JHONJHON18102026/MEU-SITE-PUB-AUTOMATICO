-- =====================================================================
-- FUTURO DIGITAL STUDIO — Estrutura inicial do banco (Entrega 1)
-- Cole tudo no Supabase > SQL Editor > Run  (ou rode: npm run db:setup)
-- Pode rodar mais de uma vez: tudo é "if not exists" / "or replace".
-- =====================================================================

-- ---------- 1. PERFIS (1 linha por usuário) ----------
create table if not exists public.profiles (
  id             uuid primary key references auth.users(id) on delete cascade,
  name           text not null default '',
  plan           text not null default 'free' check (plan in ('free','starter','pro','agency')),
  coins_balance  integer not null default 0 check (coins_balance >= 0),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- ---------- 2. EXTRATO DE CRÉDITOS (auditoria de toda entrada/saída) ----------
create table if not exists public.credit_ledger (
  id             bigint generated always as identity primary key,
  user_id        uuid not null references auth.users(id) on delete cascade,
  delta          integer not null,                 -- negativo = gasto, positivo = entrada/estorno
  reason         text not null,                    -- ex.: 'signup_bonus', 'avatar_image', 'refund'
  ref_id         uuid,                             -- geração relacionada
  balance_after  integer not null,
  created_at     timestamptz not null default now()
);
create index if not exists credit_ledger_user_idx on public.credit_ledger(user_id, created_at desc);

-- ---------- 3. GERAÇÕES (cada clique em "Gerar") ----------
create table if not exists public.generations (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  kind          text not null check (kind in ('avatar_image','avatar_video','ugc_video')),
  status        text not null default 'processing' check (status in ('processing','done','failed')),
  cost          integer not null default 0,
  params        jsonb not null default '{}'::jsonb,
  result_count  integer not null default 0,
  error         text,
  created_at    timestamptz not null default now(),
  completed_at  timestamptz
);
create index if not exists generations_user_idx on public.generations(user_id, created_at desc);

-- ---------- 4. AVATARES (cada imagem gerada) ----------
create table if not exists public.avatars (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  generation_id  uuid references public.generations(id) on delete set null,
  name           text not null default 'Influencer IA',
  image_url      text not null,
  storage_path   text not null,
  prompt         text not null default '',
  attributes     jsonb not null default '{}'::jsonb,
  engine         text not null default '',
  framing        text not null default '',
  aspect_ratio   text not null default '9:16',
  is_public      boolean not null default false,
  is_favorite    boolean not null default false,
  created_at     timestamptz not null default now()
);
create index if not exists avatars_user_idx on public.avatars(user_id, created_at desc);
create index if not exists avatars_public_idx on public.avatars(is_public, created_at desc) where is_public;

-- ---------- 5. SEGURANÇA (RLS): cada um só enxerga o que é seu ----------
alter table public.profiles      enable row level security;
alter table public.credit_ledger enable row level security;
alter table public.generations   enable row level security;
alter table public.avatars       enable row level security;

drop policy if exists "perfil: ler o proprio" on public.profiles;
create policy "perfil: ler o proprio" on public.profiles for select using (auth.uid() = id);
drop policy if exists "perfil: editar o nome" on public.profiles;
create policy "perfil: editar o nome" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "extrato: ler o proprio" on public.credit_ledger;
create policy "extrato: ler o proprio" on public.credit_ledger for select using (auth.uid() = user_id);

drop policy if exists "geracoes: ler as proprias" on public.generations;
create policy "geracoes: ler as proprias" on public.generations for select using (auth.uid() = user_id);

drop policy if exists "avatares: ler proprios ou publicos" on public.avatars;
create policy "avatares: ler proprios ou publicos" on public.avatars for select using (auth.uid() = user_id or is_public);
drop policy if exists "avatares: editar os proprios" on public.avatars;
create policy "avatares: editar os proprios" on public.avatars for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "avatares: apagar os proprios" on public.avatars;
create policy "avatares: apagar os proprios" on public.avatars for delete using (auth.uid() = user_id);

-- O usuário NÃO pode mudar o próprio saldo nem o plano pelo navegador:
revoke update on public.profiles from authenticated;
grant update (name, updated_at) on public.profiles to authenticated;

-- ---------- 6. DÉBITO ATÔMICO (nunca deixa o saldo negativo) ----------
create or replace function public.debit_credits(p_user uuid, p_amount integer, p_reason text, p_ref uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_balance integer;
begin
  if p_amount <= 0 then
    raise exception 'amount must be positive';
  end if;

  update public.profiles
     set coins_balance = coins_balance - p_amount, updated_at = now()
   where id = p_user and coins_balance >= p_amount
  returning coins_balance into v_balance;

  if v_balance is null then
    raise exception 'INSUFFICIENT_CREDITS' using errcode = 'P0001';
  end if;

  insert into public.credit_ledger(user_id, delta, reason, ref_id, balance_after)
  values (p_user, -p_amount, p_reason, p_ref, v_balance);

  return v_balance;
end;
$$;

create or replace function public.credit_credits(p_user uuid, p_amount integer, p_reason text, p_ref uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_balance integer;
begin
  if p_amount <= 0 then
    raise exception 'amount must be positive';
  end if;

  update public.profiles
     set coins_balance = coins_balance + p_amount, updated_at = now()
   where id = p_user
  returning coins_balance into v_balance;

  insert into public.credit_ledger(user_id, delta, reason, ref_id, balance_after)
  values (p_user, p_amount, p_reason, p_ref, v_balance);

  return v_balance;
end;
$$;

-- Só o servidor (service_role) pode mexer em créditos:
revoke all on function public.debit_credits(uuid, integer, text, uuid) from public, anon, authenticated;
revoke all on function public.credit_credits(uuid, integer, text, uuid) from public, anon, authenticated;
grant execute on function public.debit_credits(uuid, integer, text, uuid) to service_role;
grant execute on function public.credit_credits(uuid, integer, text, uuid) to service_role;

-- ---------- 7. NOVO USUÁRIO: cria perfil + bônus de boas-vindas ----------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_bonus constant integer := 20;  -- créditos de boas-vindas (ajuste aqui)
begin
  insert into public.profiles(id, name, coins_balance)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)), v_bonus)
  on conflict (id) do nothing;

  insert into public.credit_ledger(user_id, delta, reason, balance_after)
  values (new.id, v_bonus, 'signup_bonus', v_bonus);

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Usuários que já existiam antes deste script também ganham perfil:
insert into public.profiles(id, name, coins_balance)
select u.id, coalesce(u.raw_user_meta_data->>'name', split_part(u.email, '@', 1)), 20
  from auth.users u
 where not exists (select 1 from public.profiles p where p.id = u.id);

-- ---------- 8. ARMAZENAMENTO DAS IMAGENS ----------
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;
