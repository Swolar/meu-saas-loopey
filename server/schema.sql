-- Tabela para armazenar os sites
create table if not exists sites (
  id text primary key,
  name text not null,
  domain text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
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

-- Habilitar RLS
alter table sites enable row level security;
alter table site_history enable row level security;

-- Políticas para SITES

-- Permitir leitura pública (SELECT)
drop policy if exists "Public sites are viewable by everyone" on sites;
create policy "Public sites are viewable by everyone" on sites for select using (true);

-- Permitir criação de sites (INSERT)
drop policy if exists "Public sites can be created by everyone" on sites;
create policy "Public sites can be created by everyone" on sites for insert with check (true);

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
