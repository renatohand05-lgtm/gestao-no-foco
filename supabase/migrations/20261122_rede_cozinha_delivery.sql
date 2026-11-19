-- Painel Operacional de Rede (multi-loja) — Rodada 16: cozinha central (rupturas e estoque) e checklist de delivery.
--
-- Aditiva: só cria tabelas, funções e políticas novas (prefixo rede_). Não altera nem remove nada existente.
-- Reaproveita as funções de acesso da rodada 14 (rede_lojas_permitidas / rede_tenants_permitidos): o banco
-- decide quem lê e quem grava, por perfil, módulo e loja.
--
--   rupturas   -> rede_rupturas             (por loja)
--   estoque_cc -> rede_cc_estoque           (por empresa: a cozinha central abastece toda a rede)
--   delivery   -> rede_delivery_registros   (por loja)

-- ---------------------------------------------------------------------------
-- 1. Rupturas (item em falta na loja)
-- ---------------------------------------------------------------------------
-- Cada ruptura é um evento: a mesma loja pode registrar o mesmo item duas vezes no dia (motivos ou
-- horários diferentes), por isso não há restrição de unicidade.
create table if not exists public.rede_rupturas (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  loja_id uuid not null,
  data date not null,
  item text not null,
  motivo text not null,
  horas numeric(6,1) not null default 0,
  acao text,
  origem text not null default 'manual',
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint rede_rup_loja_fk foreign key (tenant_id, loja_id) references public.rede_lojas (tenant_id, id) on delete restrict,
  constraint rede_rup_item_chk check (char_length(btrim(item)) between 1 and 120),
  constraint rede_rup_motivo_chk check (motivo in ('Falta na cozinha central', 'Atraso na entrega', 'Erro no pedido da loja', 'Problema de qualidade', 'Demanda acima do previsto')),
  constraint rede_rup_horas_chk check (horas >= 0 and horas <= 720),
  constraint rede_rup_acao_chk check (char_length(coalesce(acao, '')) <= 300),
  constraint rede_rup_origem_chk check (origem in ('manual', 'exemplo'))
);
create index if not exists rede_rup_tenant_data_idx on public.rede_rupturas (tenant_id, data);
create index if not exists rede_rup_loja_data_idx on public.rede_rupturas (loja_id, data);
comment on table public.rede_rupturas is
  'Rupturas registradas pelas lojas (item em falta, motivo, horas indisponível e ação corretiva). Alimenta o indicador "Rupturas por semana".';

-- ---------------------------------------------------------------------------
-- 2. Estoque da cozinha central
-- ---------------------------------------------------------------------------
-- Reposição sugerida = máx(0, mínimo + consumo diário × 7 − atual) — calculada na leitura, não gravada.
create table if not exists public.rede_cc_estoque (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  item text not null,
  unidade text not null default 'un',
  atual numeric(14,3) not null default 0,
  minimo numeric(14,3) not null default 0,
  consumo_dia numeric(14,3) not null default 0,
  custo_unitario numeric(14,4) not null default 0,
  origem text not null default 'manual',
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint rede_cc_item_chk check (char_length(btrim(item)) between 1 and 120),
  constraint rede_cc_un_chk check (char_length(btrim(unidade)) between 1 and 12),
  constraint rede_cc_valores_chk check (atual >= 0 and minimo >= 0 and consumo_dia >= 0 and custo_unitario >= 0),
  constraint rede_cc_origem_chk check (origem in ('manual', 'exemplo'))
);
create unique index if not exists rede_cc_item_uk on public.rede_cc_estoque (tenant_id, lower(btrim(item)));
comment on table public.rede_cc_estoque is 'Produtos da cozinha central: estoque atual, mínimo, consumo diário e custo unitário.';

-- ---------------------------------------------------------------------------
-- 3. Checklist de delivery (diário ou semanal, por loja)
-- ---------------------------------------------------------------------------
-- Um registro por loja, data e período. No período semanal a data é a segunda-feira da semana.
-- Pelo menos um dos cinco indicadores com meta precisa estar preenchido.
-- rotina: respostas da rotina operacional, {"0":"sim","3":"nao",...} (itens 0 a 6; sim | nao | na).
create table if not exists public.rede_delivery_registros (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  loja_id uuid not null,
  data date not null,
  periodo text not null default 'diario',
  responsavel text,
  preparo numeric(6,1),
  cancelamentos numeric(5,2),
  nota_ifood numeric(3,2),
  tempo_online numeric(5,2),
  rupturas integer,
  pedidos integer,
  ticket_medio numeric(14,2),
  conversao numeric(5,2),
  atrasos numeric(5,2),
  comissoes numeric(5,2),
  frete_subsidiado numeric(14,2),
  promocoes numeric(14,2),
  custo_pedido numeric(14,2),
  rotina jsonb not null default '{}'::jsonb,
  observacoes text,
  origem text not null default 'manual',
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint rede_del_loja_fk foreign key (tenant_id, loja_id) references public.rede_lojas (tenant_id, id) on delete restrict,
  constraint rede_del_periodo_chk check (periodo in ('diario', 'semanal')),
  constraint rede_del_semana_chk check (periodo = 'diario' or extract(isodow from data) = 1),
  constraint rede_del_resp_chk check (char_length(coalesce(responsavel, '')) <= 120),
  constraint rede_del_obs_chk check (char_length(coalesce(observacoes, '')) <= 1000),
  constraint rede_del_preparo_chk check (preparo is null or (preparo >= 0 and preparo <= 600)),
  constraint rede_del_cancel_chk check (cancelamentos is null or (cancelamentos >= 0 and cancelamentos <= 100)),
  constraint rede_del_nota_chk check (nota_ifood is null or (nota_ifood >= 0 and nota_ifood <= 5)),
  constraint rede_del_online_chk check (tempo_online is null or (tempo_online >= 0 and tempo_online <= 100)),
  constraint rede_del_rupt_chk check (rupturas is null or (rupturas >= 0 and rupturas <= 100000)),
  constraint rede_del_pedidos_chk check (pedidos is null or (pedidos >= 0 and pedidos <= 10000000)),
  constraint rede_del_ticket_chk check (ticket_medio is null or ticket_medio >= 0),
  constraint rede_del_conv_chk check (conversao is null or (conversao >= 0 and conversao <= 100)),
  constraint rede_del_atraso_chk check (atrasos is null or (atrasos >= 0 and atrasos <= 100)),
  constraint rede_del_comissao_chk check (comissoes is null or (comissoes >= 0 and comissoes <= 100)),
  constraint rede_del_rs_chk check (coalesce(frete_subsidiado, 0) >= 0 and coalesce(promocoes, 0) >= 0 and coalesce(custo_pedido, 0) >= 0),
  constraint rede_del_alguma_meta_chk check (num_nonnulls(preparo, cancelamentos, nota_ifood, tempo_online, rupturas) >= 1),
  constraint rede_del_origem_chk check (origem in ('manual', 'exemplo')),
  constraint rede_del_uk unique (loja_id, data, periodo)
);
create index if not exists rede_del_tenant_data_idx on public.rede_delivery_registros (tenant_id, data);

create or replace function public.rede_delivery_validar()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  k text;
  v jsonb;
begin
  if jsonb_typeof(new.rotina) is distinct from 'object' then
    raise exception 'Rotina de delivery inválida: use uma resposta por item.' using errcode = '23514';
  end if;
  for k, v in select * from jsonb_each(new.rotina) loop
    if k !~ '^[0-6]$' then
      raise exception 'Rotina de delivery inválida: item fora da lista.' using errcode = '23514';
    end if;
    if jsonb_typeof(v) <> 'string' or (v #>> '{}') not in ('sim', 'nao', 'na') then
      raise exception 'Rotina de delivery inválida: responda Sim, Não ou Não se aplica.' using errcode = '23514';
    end if;
  end loop;
  return new;
end;
$$;
drop trigger if exists rede_delivery_validar_trg on public.rede_delivery_registros;
create trigger rede_delivery_validar_trg before insert or update on public.rede_delivery_registros
  for each row execute function public.rede_delivery_validar();

-- ---------------------------------------------------------------------------
-- 4. Triggers: atualizado_em e histórico de alterações
-- ---------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array['rede_rupturas', 'rede_cc_estoque', 'rede_delivery_registros']
  loop
    execute format('drop trigger if exists %I on public.%I', t || '_updated_trg', t);
    execute format('create trigger %I before update on public.%I for each row execute function public.set_updated_at()', t || '_updated_trg', t);
    execute format('drop trigger if exists %I on public.%I', t || '_historico_trg', t);
    execute format('create trigger %I after insert or update or delete on public.%I for each row execute function public.rede_historico_trg()', t || '_historico_trg', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 5. RLS
-- ---------------------------------------------------------------------------
alter table public.rede_rupturas enable row level security;
alter table public.rede_cc_estoque enable row level security;
alter table public.rede_delivery_registros enable row level security;

-- Rupturas (por loja)
create policy rede_rup_select on public.rede_rupturas for select to authenticated
  using (loja_id in (select public.rede_lojas_permitidas('rupturas', false)));
create policy rede_rup_insert on public.rede_rupturas for insert to authenticated
  with check (loja_id in (select public.rede_lojas_permitidas('rupturas', true)));
create policy rede_rup_update on public.rede_rupturas for update to authenticated
  using (loja_id in (select public.rede_lojas_permitidas('rupturas', true)))
  with check (loja_id in (select public.rede_lojas_permitidas('rupturas', true)));
create policy rede_rup_delete on public.rede_rupturas for delete to authenticated
  using (loja_id in (select public.rede_lojas_permitidas('rupturas', true)));

-- Estoque da cozinha central (por empresa; gravar exige acesso a todas as lojas)
create policy rede_cc_select on public.rede_cc_estoque for select to authenticated
  using (tenant_id in (select public.rede_tenants_permitidos('estoque_cc', false)));
create policy rede_cc_insert on public.rede_cc_estoque for insert to authenticated
  with check (tenant_id in (select public.rede_tenants_permitidos('estoque_cc', true)));
create policy rede_cc_update on public.rede_cc_estoque for update to authenticated
  using (tenant_id in (select public.rede_tenants_permitidos('estoque_cc', true)))
  with check (tenant_id in (select public.rede_tenants_permitidos('estoque_cc', true)));
create policy rede_cc_delete on public.rede_cc_estoque for delete to authenticated
  using (tenant_id in (select public.rede_tenants_permitidos('estoque_cc', true)));

-- Checklist de delivery (por loja)
create policy rede_del_select on public.rede_delivery_registros for select to authenticated
  using (loja_id in (select public.rede_lojas_permitidas('delivery', false)));
create policy rede_del_insert on public.rede_delivery_registros for insert to authenticated
  with check (loja_id in (select public.rede_lojas_permitidas('delivery', true)));
create policy rede_del_update on public.rede_delivery_registros for update to authenticated
  using (loja_id in (select public.rede_lojas_permitidas('delivery', true)))
  with check (loja_id in (select public.rede_lojas_permitidas('delivery', true)));
create policy rede_del_delete on public.rede_delivery_registros for delete to authenticated
  using (loja_id in (select public.rede_lojas_permitidas('delivery', true)));
