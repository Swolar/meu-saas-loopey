-- Tabela para armazenar os sites
create table if not exists sites (
  id text primary key,
  name text not null,
  domain text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  total_views integer default 0,
  theme_color text default '#006fee'
);

-- Tabela para armazenar histórico de métricas
create table if not exists site_history (
  site_id text references sites(id) on delete cascade,
  timeframe text not null, -- 'minutes', 'hours', 'days'
  time_bucket text not null, -- O rótulo de tempo (ex: "10:00", "Seg")
  users_count integer default 0,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (site_id, timeframe, time_bucket)
);

-- Tabela para estatísticas diárias (necessária para visualização de 7 dias)
create table if not exists daily_site_stats (
  site_id text references sites(id) on delete cascade,
  date date not null,
  views integer default 0,
  primary key (site_id, date)
);

-- Habilitar RLS
alter table sites enable row level security;
alter table site_history enable row level security;
alter table daily_site_stats enable row level security;

-- Políticas para SITES

-- Permitir leitura pública (SELECT)
drop policy if exists "Public sites are viewable by everyone" on sites;
create policy "Public sites are viewable by everyone" on sites for select using (true);

-- Permitir criação de sites (INSERT)
drop policy if exists "Public sites can be created by everyone" on sites;
create policy "Public sites can be created by everyone" on sites for insert with check (true);

-- Permitir atualização de sites (UPDATE)
drop policy if exists "Public sites can be updated by everyone" on sites;
create policy "Public sites can be updated by everyone" on sites for update using (true);

-- Permitir exclusão de sites (DELETE)
drop policy if exists "Public sites can be deleted by everyone" on sites;
create policy "Public sites can be deleted by everyone" on sites for delete using (true);

-- Políticas para SITE_HISTORY

-- Permitir leitura pública (SELECT)
drop policy if exists "Public history is viewable by everyone" on site_history;
create policy "Public history is viewable by everyone" on site_history for select using (true);

-- Permitir inserção de histórico (INSERT)
drop policy if exists "Public history can be created by everyone" on site_history;
create policy "Public history can be created by everyone" on site_history for insert with check (true);

-- Permitir atualização de histórico (UPDATE) - Necessário para upsert
drop policy if exists "Public history can be updated by everyone" on site_history;
create policy "Public history can be updated by everyone" on site_history for update using (true);

-- Permitir exclusão de histórico (DELETE)
drop policy if exists "Public history can be deleted by everyone" on site_history;
create policy "Public history can be deleted by everyone" on site_history for delete using (true);

-- Políticas para DAILY_SITE_STATS

-- Permitir leitura pública (SELECT)
drop policy if exists "Public daily stats are viewable by everyone" on daily_site_stats;
create policy "Public daily stats are viewable by everyone" on daily_site_stats for select using (true);

-- Permitir inserção/atualização (INSERT/UPDATE)
drop policy if exists "Public daily stats can be created by everyone" on daily_site_stats;
create policy "Public daily stats can be created by everyone" on daily_site_stats for insert with check (true);

drop policy if exists "Public daily stats can be updated by everyone" on daily_site_stats;
create policy "Public daily stats can be updated by everyone" on daily_site_stats for update using (true);

-- Função para incrementar visualizações
create or replace function increment_views(site_id_param text)
returns void as $$
begin
  update sites
  set total_views = coalesce(total_views, 0) + 1
  where id = site_id_param;
end;
$$ language plpgsql security definer;

-- Permissão para usar a função
grant execute on function increment_views(text) to anon, authenticated, service_role;
