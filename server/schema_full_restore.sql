-- SQL para restaurar TODAS as tabelas necessárias
-- Copie e cole isso no Editor SQL do Supabase

-- 1. Tabela de Sites
create table if not exists sites (
  id text primary key,
  name text not null,
  domain text not null,
  total_views integer default 0,
  theme_color text default '#006fee',
   slugs jsonb default '[]'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Tabela de Usuários
create table if not exists users (
  id uuid default gen_random_uuid() primary key,
  username text unique not null,
  password text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Histórico Detalhado (Para gráficos de Horas e Dias)
create table if not exists site_history (
  site_id text references sites(id) on delete cascade,
  timeframe text not null, -- 'minutes', 'hours', 'days'
  time_bucket text not null, -- '10:00', 'Seg'
  users_count integer default 0,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (site_id, timeframe, time_bucket)
);

-- 4. Estatísticas Diárias (Para relatórios de longo prazo - Últimos 7/30 dias)
create table if not exists daily_site_stats (
  site_id text references sites(id) on delete cascade,
  date date not null,
  views integer default 0,
  primary key (site_id, date)
);

-- Habilitar Segurança (Row Level Security)
alter table sites enable row level security;
alter table users enable row level security;
alter table site_history enable row level security;
alter table daily_site_stats enable row level security;

-- Criar Políticas de Acesso (Públicas para leitura/escrita simplificada neste caso)
-- Em produção real, você restringiria isso, mas para corrigir o erro agora:

-- Sites
drop policy if exists "Sites Public Access" on sites;
create policy "Sites Public Access" on sites for all using (true);

-- Users
drop policy if exists "Users Public Access" on users;
create policy "Users Public Access" on users for all using (true);

-- Site History
drop policy if exists "History Public Access" on site_history;
create policy "History Public Access" on site_history for all using (true);

-- Daily Stats
drop policy if exists "Daily Stats Public Access" on daily_site_stats;
create policy "Daily Stats Public Access" on daily_site_stats for all using (true);

-- Função para incrementar visualizações (Atomicamente)
create or replace function increment_views(site_id_param text)
returns void as $$
begin
  update sites
  set total_views = coalesce(total_views, 0) + 1
  where id = site_id_param;
end;
$$ language plpgsql security definer;

-- Permissões
grant execute on function increment_views(text) to anon, authenticated, service_role;
