-- Adicionar coluna para contagem total de visualizações
alter table sites add column if not exists total_views bigint default 0;

-- Função segura para incrementar visualizações (evita condições de corrida)
create or replace function increment_views(site_id_param text)
returns void as $$
begin
  update sites
  set total_views = coalesce(total_views, 0) + 1
  where id = site_id_param;
end;
$$ language plpgsql security definer;

-- Garantir permissões para a função
grant execute on function increment_views(text) to anon, authenticated, service_role;
