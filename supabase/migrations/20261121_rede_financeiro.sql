-- Painel Operacional de Rede (multi-loja) — Rodada 15: CMV, DRE e orçamento/expansão.
--
-- Aditiva: só cria tabelas, funções e políticas novas (prefixo rede_). Não altera
-- nem remove nada existente. Reaproveita as funções de acesso da rodada 14
-- (rede_lojas_permitidas / rede_tenants_permitidos), então o RLS segue o mesmo
-- padrão: o banco decide quem lê e quem grava, por perfil, módulo e loja.
--
--   cmv        -> rede_cmv_semanal, rede_cmv_itens      (por loja)
--   dre        -> rede_dre_premissas, rede_dre_lancamentos (por loja; premissa padrão da rede = loja_id nulo)
--   orcamento  -> rede_orc_cenarios, rede_expansao_unidades, rede_expansao_config (por empresa)

-- ---------------------------------------------------------------------------
-- 1. CMV semanal (contagem de estoque)
-- ---------------------------------------------------------------------------
-- CMV em reais = estoque inicial + compras + transferências de entrada
--                − transferências de saída − devoluções a fornecedor − estoque final.
-- vendas nulo = usa a soma das vendas lançadas no módulo Vendas na semana (sem digitar duas vezes).
create table if not exists public.rede_cmv_semanal (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  loja_id uuid not null,
  semana date not null,
  vendas numeric(14,2),
  cmv_teorico numeric(6,2) not null,
  estoque_inicial numeric(14,2) not null default 0,
  compras numeric(14,2) not null default 0,
  transferencias_entrada numeric(14,2) not null default 0,
  transferencias_saida numeric(14,2) not null default 0,
  devolucoes numeric(14,2) not null default 0,
  estoque_final numeric(14,2) not null default 0,
  responsavel text,
  observacoes text,
  origem text not null default 'manual',
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint rede_cmv_loja_fk foreign key (tenant_id, loja_id) references public.rede_lojas (tenant_id, id) on delete restrict,
  constraint rede_cmv_semana_chk check (extract(isodow from semana) = 1),
  constraint rede_cmv_vendas_chk check (vendas is null or vendas > 0),
  constraint rede_cmv_teorico_chk check (cmv_teorico >= 0 and cmv_teorico <= 100),
  constraint rede_cmv_valores_chk check (
    estoque_inicial >= 0 and compras >= 0 and transferencias_entrada >= 0
    and transferencias_saida >= 0 and devolucoes >= 0 and estoque_final >= 0
  ),
  constraint rede_cmv_texto_chk check (char_length(coalesce(responsavel, '')) <= 120 and char_length(coalesce(observacoes, '')) <= 500),
  constraint rede_cmv_origem_chk check (origem in ('manual', 'exemplo')),
  constraint rede_cmv_uk unique (loja_id, semana)
);
create index if not exists rede_cmv_tenant_semana_idx on public.rede_cmv_semanal (tenant_id, semana);
comment on table public.rede_cmv_semanal is
  'Contagem semanal de estoque por loja (semana começa na segunda). CMV real = EI + compras + transf. entrada − transf. saída − devoluções − EF.';

-- Consumo por item da contagem (dispersão por item). Opcional.
create table if not exists public.rede_cmv_itens (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  loja_id uuid not null,
  semana date not null,
  item text not null,
  consumo_teorico numeric(14,3) not null,
  consumo_real numeric(14,3) not null,
  created_at timestamptz not null default now(),
  constraint rede_cmv_itens_loja_fk foreign key (tenant_id, loja_id) references public.rede_lojas (tenant_id, id) on delete restrict,
  constraint rede_cmv_itens_contagem_fk foreign key (loja_id, semana) references public.rede_cmv_semanal (loja_id, semana) on delete cascade on update cascade,
  constraint rede_cmv_itens_item_chk check (char_length(btrim(item)) between 1 and 120),
  constraint rede_cmv_itens_valores_chk check (consumo_teorico > 0 and consumo_real >= 0),
  constraint rede_cmv_itens_uk unique (loja_id, semana, item)
);

-- ---------------------------------------------------------------------------
-- 2. DRE: premissas e lançamentos reais
-- ---------------------------------------------------------------------------
-- loja_id nulo = premissa padrão da rede (todos os campos obrigatórios).
-- loja_id preenchido = exceção da loja: só os campos preenchidos substituem o padrão.
create table if not exists public.rede_dre_premissas (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  loja_id uuid,
  cmv numeric(6,2),
  pessoal numeric(6,2),
  impostos numeric(6,2),
  custo_delivery numeric(6,2),
  base_delivery text,
  manutencao numeric(6,2),
  marketing numeric(6,2),
  cto numeric(14,2),
  agua numeric(14,2),
  energia numeric(14,2),
  mix_delivery numeric(6,2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint rede_dre_prem_loja_fk foreign key (tenant_id, loja_id) references public.rede_lojas (tenant_id, id) on delete restrict,
  constraint rede_dre_prem_tenant_fk foreign key (tenant_id) references public.tenants (id) on delete cascade,
  constraint rede_dre_prem_pct_chk check (
    coalesce(cmv, 0) between 0 and 100 and coalesce(pessoal, 0) between 0 and 100
    and coalesce(impostos, 0) between 0 and 100 and coalesce(custo_delivery, 0) between 0 and 100
    and coalesce(manutencao, 0) between 0 and 100 and coalesce(marketing, 0) between 0 and 100
    and coalesce(mix_delivery, 0) between 0 and 100
  ),
  constraint rede_dre_prem_rs_chk check (coalesce(cto, 0) >= 0 and coalesce(agua, 0) >= 0 and coalesce(energia, 0) >= 0),
  constraint rede_dre_prem_base_chk check (base_delivery is null or base_delivery in ('delivery', 'total')),
  constraint rede_dre_prem_padrao_chk check (
    loja_id is not null
    or (cmv is not null and pessoal is not null and impostos is not null and custo_delivery is not null
        and base_delivery is not null and manutencao is not null and marketing is not null
        and cto is not null and agua is not null and energia is not null and mix_delivery is not null)
  )
);
create unique index if not exists rede_dre_prem_uk
  on public.rede_dre_premissas (tenant_id, coalesce(loja_id, '00000000-0000-0000-0000-000000000000'::uuid));

-- Lançamento real de uma linha do DRE no mês (substitui a estimativa da premissa).
create table if not exists public.rede_dre_lancamentos (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  loja_id uuid not null,
  mes date not null,
  linha text not null,
  valor numeric(14,2) not null,
  observacao text,
  origem text not null default 'manual',
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint rede_dre_lanc_loja_fk foreign key (tenant_id, loja_id) references public.rede_lojas (tenant_id, id) on delete restrict,
  constraint rede_dre_lanc_mes_chk check (mes = date_trunc('month', mes)::date),
  constraint rede_dre_lanc_linha_chk check (linha in ('impostos', 'cmv', 'folha', 'delivery', 'manutencao', 'marketing', 'cto', 'agua', 'energia')),
  constraint rede_dre_lanc_valor_chk check (valor >= 0),
  constraint rede_dre_lanc_obs_chk check (char_length(coalesce(observacao, '')) <= 300),
  constraint rede_dre_lanc_origem_chk check (origem in ('manual', 'exemplo')),
  constraint rede_dre_lanc_uk unique (loja_id, mes, linha)
);
create index if not exists rede_dre_lanc_tenant_mes_idx on public.rede_dre_lancamentos (tenant_id, mes);

-- ---------------------------------------------------------------------------
-- 3. Orçamento e expansão
-- ---------------------------------------------------------------------------
create table if not exists public.rede_orc_cenarios (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  nome text not null,
  descricao text,
  faturamento numeric(14,2) not null,
  mix_delivery numeric(6,2) not null,
  cmv numeric(6,2) not null,
  folha numeric(6,2) not null,
  impostos numeric(6,2) not null,
  custo_delivery numeric(6,2) not null,
  base_delivery text not null default 'delivery',
  manutencao numeric(6,2) not null,
  marketing numeric(6,2) not null,
  cto numeric(14,2) not null,
  agua numeric(14,2) not null,
  energia numeric(14,2) not null,
  -- % do faturamento-alvo em cada mês a partir da inauguração (mês 1, mês 2, ...)
  curva jsonb not null default '[70,80,90,95,100,100]'::jsonb,
  -- cenário usado por padrão na simulação (no máximo um por empresa)
  padrao boolean not null default false,
  origem text not null default 'manual',
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint rede_orc_nome_chk check (char_length(btrim(nome)) between 1 and 80),
  constraint rede_orc_desc_chk check (char_length(coalesce(descricao, '')) <= 300),
  constraint rede_orc_fat_chk check (faturamento > 0),
  constraint rede_orc_pct_chk check (
    mix_delivery between 0 and 100 and cmv between 0 and 100 and folha between 0 and 100
    and impostos between 0 and 100 and custo_delivery between 0 and 100
    and manutencao between 0 and 100 and marketing between 0 and 100
  ),
  constraint rede_orc_rs_chk check (cto >= 0 and agua >= 0 and energia >= 0),
  constraint rede_orc_base_chk check (base_delivery in ('delivery', 'total')),
  constraint rede_orc_curva_chk check (case when jsonb_typeof(curva) = 'array' then jsonb_array_length(curva) between 1 and 12 else false end),
  constraint rede_orc_origem_chk check (origem in ('manual', 'exemplo')),
  constraint rede_orc_nome_uk unique (tenant_id, nome),
  constraint rede_orc_tenant_id_uk unique (tenant_id, id)
);
create unique index if not exists rede_orc_padrao_uk on public.rede_orc_cenarios (tenant_id) where padrao;

create or replace function public.rede_orc_cenarios_validar()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v jsonb;
begin
  if jsonb_typeof(new.curva) is distinct from 'array' then
    raise exception 'Curva de maturação inválida: informe uma lista de percentuais.' using errcode = '23514';
  end if;
  for v in select * from jsonb_array_elements(new.curva) loop
    if jsonb_typeof(v) <> 'number' or (v #>> '{}')::numeric < 0 or (v #>> '{}')::numeric > 300 then
      raise exception 'Curva de maturação inválida: use percentuais entre 0 e 300.' using errcode = '23514';
    end if;
  end loop;
  return new;
end;
$$;
drop trigger if exists rede_orc_cenarios_validar_trg on public.rede_orc_cenarios;
create trigger rede_orc_cenarios_validar_trg before insert or update on public.rede_orc_cenarios
  for each row execute function public.rede_orc_cenarios_validar();

-- Projetos de novas unidades. Separado do cadastro real de lojas (rede_lojas):
-- só vira loja quando a pessoa cadastra em "Lojas e acessos" e vincula (loja_id).
create table if not exists public.rede_expansao_unidades (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  nome text not null,
  abertura_prevista date,
  status text not null default 'planejada',
  cenario_id uuid,
  loja_id uuid,
  faturamento_alvo numeric(14,2),
  observacao text,
  origem text not null default 'manual',
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint rede_exp_cenario_fk foreign key (tenant_id, cenario_id) references public.rede_orc_cenarios (tenant_id, id) on delete set null (cenario_id),
  constraint rede_exp_loja_fk foreign key (tenant_id, loja_id) references public.rede_lojas (tenant_id, id) on delete set null (loja_id),
  constraint rede_exp_nome_chk check (char_length(btrim(nome)) between 1 and 80),
  constraint rede_exp_status_chk check (status in ('planejada', 'inaugurada', 'cancelada')),
  constraint rede_exp_mes_chk check (abertura_prevista is null or abertura_prevista = date_trunc('month', abertura_prevista)::date),
  constraint rede_exp_fat_chk check (faturamento_alvo is null or faturamento_alvo > 0),
  constraint rede_exp_obs_chk check (char_length(coalesce(observacao, '')) <= 300),
  constraint rede_exp_origem_chk check (origem in ('manual', 'exemplo')),
  constraint rede_exp_nome_uk unique (tenant_id, nome)
);

-- Parâmetros da simulação da rede (ex.: "rede com 10 lojas").
create table if not exists public.rede_expansao_config (
  tenant_id uuid primary key references public.tenants (id) on delete cascade,
  meta_lojas integer not null default 10,
  faturamento_minimo numeric(14,2) not null default 500000,
  -- lojas em operação cujo DRE atual entra na simulação (as demais entram pelo orçamento)
  lojas_base uuid[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint rede_exp_cfg_meta_chk check (meta_lojas between 1 and 200),
  constraint rede_exp_cfg_min_chk check (faturamento_minimo >= 0)
);

create or replace function public.rede_expansao_config_validar()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if exists (
    select 1 from unnest(new.lojas_base) b(id)
    where not exists (select 1 from public.rede_lojas l where l.id = b.id and l.tenant_id = new.tenant_id)
  ) then
    raise exception 'Loja base inválida para esta empresa.' using errcode = '23514';
  end if;
  return new;
end;
$$;
drop trigger if exists rede_expansao_config_validar_trg on public.rede_expansao_config;
create trigger rede_expansao_config_validar_trg before insert or update on public.rede_expansao_config
  for each row execute function public.rede_expansao_config_validar();

-- ---------------------------------------------------------------------------
-- 4. Triggers: atualizado_em e histórico de alterações
-- ---------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array['rede_cmv_semanal', 'rede_dre_premissas', 'rede_dre_lancamentos', 'rede_orc_cenarios', 'rede_expansao_unidades', 'rede_expansao_config']
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
alter table public.rede_cmv_semanal enable row level security;
alter table public.rede_cmv_itens enable row level security;
alter table public.rede_dre_premissas enable row level security;
alter table public.rede_dre_lancamentos enable row level security;
alter table public.rede_orc_cenarios enable row level security;
alter table public.rede_expansao_unidades enable row level security;
alter table public.rede_expansao_config enable row level security;

-- CMV (por loja)
create policy rede_cmv_select on public.rede_cmv_semanal for select to authenticated
  using (loja_id in (select public.rede_lojas_permitidas('cmv', false)));
create policy rede_cmv_insert on public.rede_cmv_semanal for insert to authenticated
  with check (loja_id in (select public.rede_lojas_permitidas('cmv', true)));
create policy rede_cmv_update on public.rede_cmv_semanal for update to authenticated
  using (loja_id in (select public.rede_lojas_permitidas('cmv', true)))
  with check (loja_id in (select public.rede_lojas_permitidas('cmv', true)));
create policy rede_cmv_delete on public.rede_cmv_semanal for delete to authenticated
  using (loja_id in (select public.rede_lojas_permitidas('cmv', true)));

create policy rede_cmv_itens_select on public.rede_cmv_itens for select to authenticated
  using (loja_id in (select public.rede_lojas_permitidas('cmv', false)));
create policy rede_cmv_itens_insert on public.rede_cmv_itens for insert to authenticated
  with check (loja_id in (select public.rede_lojas_permitidas('cmv', true)));
create policy rede_cmv_itens_update on public.rede_cmv_itens for update to authenticated
  using (loja_id in (select public.rede_lojas_permitidas('cmv', true)))
  with check (loja_id in (select public.rede_lojas_permitidas('cmv', true)));
create policy rede_cmv_itens_delete on public.rede_cmv_itens for delete to authenticated
  using (loja_id in (select public.rede_lojas_permitidas('cmv', true)));

-- DRE: premissas (padrão da rede quando loja_id é nulo) e lançamentos
create policy rede_dre_prem_select on public.rede_dre_premissas for select to authenticated
  using (
    (loja_id is not null and loja_id in (select public.rede_lojas_permitidas('dre', false)))
    or (loja_id is null and tenant_id in (select public.rede_tenants_permitidos('dre', false)))
  );
create policy rede_dre_prem_insert on public.rede_dre_premissas for insert to authenticated
  with check (
    (loja_id is not null and loja_id in (select public.rede_lojas_permitidas('dre', true)))
    or (loja_id is null and tenant_id in (select public.rede_tenants_permitidos('dre', true)))
  );
create policy rede_dre_prem_update on public.rede_dre_premissas for update to authenticated
  using (
    (loja_id is not null and loja_id in (select public.rede_lojas_permitidas('dre', true)))
    or (loja_id is null and tenant_id in (select public.rede_tenants_permitidos('dre', true)))
  )
  with check (
    (loja_id is not null and loja_id in (select public.rede_lojas_permitidas('dre', true)))
    or (loja_id is null and tenant_id in (select public.rede_tenants_permitidos('dre', true)))
  );
create policy rede_dre_prem_delete on public.rede_dre_premissas for delete to authenticated
  using (loja_id is not null and loja_id in (select public.rede_lojas_permitidas('dre', true)));

create policy rede_dre_lanc_select on public.rede_dre_lancamentos for select to authenticated
  using (loja_id in (select public.rede_lojas_permitidas('dre', false)));
create policy rede_dre_lanc_insert on public.rede_dre_lancamentos for insert to authenticated
  with check (loja_id in (select public.rede_lojas_permitidas('dre', true)));
create policy rede_dre_lanc_update on public.rede_dre_lancamentos for update to authenticated
  using (loja_id in (select public.rede_lojas_permitidas('dre', true)))
  with check (loja_id in (select public.rede_lojas_permitidas('dre', true)));
create policy rede_dre_lanc_delete on public.rede_dre_lancamentos for delete to authenticated
  using (loja_id in (select public.rede_lojas_permitidas('dre', true)));

-- Orçamento e expansão (por empresa)
create policy rede_orc_select on public.rede_orc_cenarios for select to authenticated
  using (tenant_id in (select public.rede_tenants_permitidos('orcamento', false)));
create policy rede_orc_insert on public.rede_orc_cenarios for insert to authenticated
  with check (tenant_id in (select public.rede_tenants_permitidos('orcamento', true)));
create policy rede_orc_update on public.rede_orc_cenarios for update to authenticated
  using (tenant_id in (select public.rede_tenants_permitidos('orcamento', true)))
  with check (tenant_id in (select public.rede_tenants_permitidos('orcamento', true)));
create policy rede_orc_delete on public.rede_orc_cenarios for delete to authenticated
  using (tenant_id in (select public.rede_tenants_permitidos('orcamento', true)));

create policy rede_exp_select on public.rede_expansao_unidades for select to authenticated
  using (tenant_id in (select public.rede_tenants_permitidos('orcamento', false)));
create policy rede_exp_insert on public.rede_expansao_unidades for insert to authenticated
  with check (tenant_id in (select public.rede_tenants_permitidos('orcamento', true)));
create policy rede_exp_update on public.rede_expansao_unidades for update to authenticated
  using (tenant_id in (select public.rede_tenants_permitidos('orcamento', true)))
  with check (tenant_id in (select public.rede_tenants_permitidos('orcamento', true)));
create policy rede_exp_delete on public.rede_expansao_unidades for delete to authenticated
  using (tenant_id in (select public.rede_tenants_permitidos('orcamento', true)));

create policy rede_exp_cfg_select on public.rede_expansao_config for select to authenticated
  using (tenant_id in (select public.rede_tenants_permitidos('orcamento', false)));
create policy rede_exp_cfg_insert on public.rede_expansao_config for insert to authenticated
  with check (tenant_id in (select public.rede_tenants_permitidos('orcamento', true)));
create policy rede_exp_cfg_update on public.rede_expansao_config for update to authenticated
  using (tenant_id in (select public.rede_tenants_permitidos('orcamento', true)))
  with check (tenant_id in (select public.rede_tenants_permitidos('orcamento', true)));

-- ---------------------------------------------------------------------------
-- 6. Padrões do modelo original (configuração, não dados de loja)
-- ---------------------------------------------------------------------------
-- Premissas do DRE (CMV 21%, pessoal 19%, impostos 10%, delivery 28% sobre a venda
-- do delivery, manutenção 1,5%, marketing 7%, CTO 12.000, água 1.500, energia 4.500),
-- cenário "Base" do orçamento de nova loja (faturamento 500.000, curva 70/80/90/95/100/100)
-- e parâmetros da rede de 10 lojas. Tudo editável na interface.
create or replace function public.rede_preparar_financeiro(p_tenant uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.rede_dre_premissas
    (tenant_id, loja_id, cmv, pessoal, impostos, custo_delivery, base_delivery, manutencao, marketing, cto, agua, energia, mix_delivery)
  select p_tenant, null, 21, 19, 10, 28, 'delivery', 1.5, 7, 12000, 1500, 4500, 100
  where not exists (select 1 from public.rede_dre_premissas x where x.tenant_id = p_tenant and x.loja_id is null);

  insert into public.rede_orc_cenarios
    (tenant_id, nome, descricao, faturamento, mix_delivery, cmv, folha, impostos, custo_delivery, base_delivery, manutencao, marketing, cto, agua, energia, curva, padrao)
  select p_tenant, 'Base (modelo original)', 'Premissas do modelo original de nova loja.', 500000, 100, 21, 19, 10, 28, 'delivery', 1.5, 7, 12000, 1500, 4500, '[70,80,90,95,100,100]'::jsonb, true
  where not exists (select 1 from public.rede_orc_cenarios x where x.tenant_id = p_tenant);

  insert into public.rede_expansao_config (tenant_id, meta_lojas, faturamento_minimo, lojas_base)
  select p_tenant, 10, 500000,
         coalesce((select array_agg(l.id order by l.ordem) from public.rede_lojas l where l.tenant_id = p_tenant and l.slug in ('brooklyn', 'perdizes')), '{}')
  where not exists (select 1 from public.rede_expansao_config x where x.tenant_id = p_tenant);
end;
$$;
revoke all on function public.rede_preparar_financeiro(uuid) from public, anon, authenticated;

-- Empresas futuras já nascem com os padrões (rede_preparar_empresa passa a chamar a nova função).
create or replace function public.rede_preparar_empresa(p_tenant uuid, p_ambiente text default 'real')
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.tenants set rede_operacional = true where id = p_tenant;

  insert into public.rede_config (tenant_id, ambiente) values (p_tenant, p_ambiente)
  on conflict (tenant_id) do nothing;

  insert into public.rede_metas (tenant_id, loja_id, indicador, meta, direcao, valido_de)
  select p_tenant, null, m.indicador, m.meta, m.direcao, date '2026-01-01'
  from (values
    ('fat', 500000::numeric, 'min'),
    ('pctMeta', 100::numeric, 'min'),
    ('comp', 6::numeric, 'min'),
    ('cmv', 21::numeric, 'max'),
    ('pessoal', 19::numeric, 'max'),
    ('preparo', 15::numeric, 'max'),
    ('cancel', 2::numeric, 'max'),
    ('ifood', 4.7::numeric, 'min'),
    ('online', 97::numeric, 'min'),
    ('rupturas', 5::numeric, 'max'),
    ('absent', null::numeric, null::text),
    ('turnover', null::numeric, null::text)
  ) as m(indicador, meta, direcao)
  where not exists (
    select 1 from public.rede_metas x
    where x.tenant_id = p_tenant and x.loja_id is null and x.indicador = m.indicador and x.valido_ate is null
  );

  perform public.rede_preparar_financeiro(p_tenant);
end;
$$;
revoke all on function public.rede_preparar_empresa(uuid, text) from public, anon, authenticated;

-- Empresas que já usam o módulo.
do $$
declare
  t record;
begin
  for t in select id from public.tenants where rede_operacional loop
    perform public.rede_preparar_financeiro(t.id);
  end loop;
end $$;

-- Projeto real de expansão já conhecido: Butantã (loja cadastrada com status "inauguracao").
insert into public.rede_expansao_unidades (tenant_id, nome, abertura_prevista, status, loja_id, observacao)
select l.tenant_id, l.nome, date '2026-11-01', 'planejada', l.id, 'Inauguração prevista: ' || coalesce(l.inauguracao_prevista, 'novembro de 2026')
from public.rede_lojas l
join public.tenants t on t.id = l.tenant_id and t.rede_operacional
where l.status = 'inauguracao' and l.slug = 'butanta'
on conflict (tenant_id, nome) do nothing;
