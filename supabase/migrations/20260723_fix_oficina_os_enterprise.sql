-- =============================================================================
-- REPARO IDEMPOTENTE — Sprint 13.19 Oficina OS Enterprise
-- Arquivo: 20260723_fix_oficina_os_enterprise.sql
--
-- Causa raiz do ERROR 42P01:
--   20260723_oficina_os_enterprise.sql assumia que 20260713_create_ordens_retornos.sql
--   já havia sido aplicada (public.veiculos / ordens_servico). Em vários ambientes
--   essas tabelas NÃO existem.
--
-- Este arquivo:
--   1) cria a base (veiculos, ordens_servico, itens, retornos) se ausente;
--   2) aplica o enriquecimento enterprise de forma idempotente;
--   3) é seguro após execução parcial (IF NOT EXISTS / DO blocks);
--   4) NÃO apaga dados; NÃO recria tabelas existentes.
--
-- Execute MANUALMENTE no Supabase SQL Editor (após o diagnóstico).
-- Preferir ESTE arquivo em vez do 20260723_oficina_os_enterprise.sql original.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 0) Pré-requisitos de domínio (fail-fast claro se o ERP base não existe)
-- -----------------------------------------------------------------------------
do $$
begin
  if to_regclass('public.tenants') is null then
    raise exception 'Pré-requisito ausente: public.tenants';
  end if;
  if to_regclass('public.clientes') is null then
    raise exception 'Pré-requisito ausente: public.clientes';
  end if;
end $$;

-- =============================================================================
-- 1) VEÍCULOS (criar se ausente; enriquecer se existir)
-- Nome canônico confirmado no repo: public.veiculos (20260713)
-- Não há clientes_veiculos / frota_veiculos / ordem_servico_veiculos.
-- =============================================================================
create table if not exists public.veiculos (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  cliente_id uuid not null references public.clientes (id) on delete restrict,
  placa text,
  marca text,
  modelo text,
  versao text,
  ano integer,
  cor text,
  combustivel text,
  cambio text,
  quilometragem numeric(12, 1),
  chassi text,
  observacoes text,
  ativo boolean not null default true,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.veiculos add column if not exists versao text;
alter table public.veiculos add column if not exists combustivel text;
alter table public.veiculos add column if not exists cambio text;
alter table public.veiculos add column if not exists quilometragem numeric(12, 1);
alter table public.veiculos add column if not exists chassi text;
alter table public.veiculos add column if not exists observacoes text;
alter table public.veiculos add column if not exists ativo boolean not null default true;

create index if not exists idx_veiculos_tenant_id on public.veiculos (tenant_id);
create index if not exists idx_veiculos_cliente_id on public.veiculos (cliente_id);
create index if not exists idx_veiculos_deleted_at on public.veiculos (deleted_at);

create unique index if not exists uq_veiculos_tenant_placa_active
  on public.veiculos (tenant_id, lower(placa))
  where deleted_at is null and placa is not null and length(trim(placa)) > 0;

create or replace function public.set_veiculos_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_veiculos_updated_at on public.veiculos;
create trigger trg_veiculos_updated_at
  before update on public.veiculos
  for each row execute function public.set_veiculos_updated_at();

alter table public.veiculos enable row level security;

drop policy if exists "Membros gerenciam veiculos da empresa" on public.veiculos;
create policy "Membros gerenciam veiculos da empresa"
  on public.veiculos for all
  using (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = veiculos.tenant_id and tm.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = veiculos.tenant_id and tm.user_id = auth.uid()
    )
  );

comment on table public.veiculos is 'Veículos vinculados a clientes (oficinas) — base 13.13 + enrich 13.19';

-- =============================================================================
-- 2) ORDENS_SERVICO (nome canônico: public.ordens_servico)
-- =============================================================================
create table if not exists public.ordens_servico (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  numero bigint generated always as identity,
  cliente_id uuid not null references public.clientes (id) on delete restrict,
  veiculo_id uuid references public.veiculos (id) on delete set null,
  status text not null default 'rascunho',
  mecanico_id uuid,
  data_abertura date not null default current_date,
  data_conclusao date,
  descricao text,
  valor_total numeric(15, 2) not null default 0,
  venda_id uuid,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- FKs opcionais se tabelas existirem (não falhar se ausentes)
do $$
begin
  if to_regclass('public.profiles') is not null
     and not exists (
       select 1 from pg_constraint where conname = 'ordens_servico_mecanico_id_fkey'
     ) then
    begin
      alter table public.ordens_servico
        add constraint ordens_servico_mecanico_id_fkey
        foreign key (mecanico_id) references public.profiles (id) on delete set null;
    exception when others then null;
    end;
  end if;

  if to_regclass('public.vendas') is not null
     and not exists (
       select 1 from pg_constraint where conname = 'ordens_servico_venda_id_fkey'
     ) then
    begin
      alter table public.ordens_servico
        add constraint ordens_servico_venda_id_fkey
        foreign key (venda_id) references public.vendas (id) on delete set null;
    exception when others then null;
    end;
  end if;
end $$;

-- Remover checks legados antes de migrar status
alter table public.ordens_servico drop constraint if exists ordens_servico_status_check;
alter table public.ordens_servico drop constraint if exists ordens_servico_check;
alter table public.ordens_servico drop constraint if exists ordens_servico_entrega_check;

-- Compatibiliza registros legados (seguro se tabela vazia)
update public.ordens_servico
set status = 'entregue'
where status = 'concluida' and deleted_at is null;

update public.ordens_servico
set status = 'rascunho'
where status = 'aberta' and deleted_at is null;

update public.ordens_servico
set status = 'cancelado'
where status = 'cancelada' and deleted_at is null;

-- Colunas enterprise
alter table public.ordens_servico
  add column if not exists quilometragem_entrada numeric(12, 1);
alter table public.ordens_servico
  add column if not exists quilometragem_saida numeric(12, 1);
alter table public.ordens_servico
  add column if not exists data_hora_entrada timestamptz;
alter table public.ordens_servico
  add column if not exists previsao_entrega timestamptz;
alter table public.ordens_servico
  add column if not exists previsao_entrega_revisada timestamptz;
alter table public.ordens_servico
  add column if not exists reclamacao_cliente text;
alter table public.ordens_servico
  add column if not exists observacoes text;
alter table public.ordens_servico
  add column if not exists nivel_combustivel text;
alter table public.ordens_servico
  add column if not exists objetos_deixados text;
alter table public.ordens_servico
  add column if not exists danos_aparentes text;
alter table public.ordens_servico
  add column if not exists responsavel_recebimento_id uuid;
alter table public.ordens_servico
  add column if not exists consultor_id uuid;
alter table public.ordens_servico
  add column if not exists centro_custo_id uuid;
alter table public.ordens_servico
  add column if not exists origem_atendimento text;
alter table public.ordens_servico
  add column if not exists prioridade text;
alter table public.ordens_servico
  add column if not exists subtotal numeric(15, 2);
alter table public.ordens_servico
  add column if not exists desconto_total numeric(15, 2);
alter table public.ordens_servico
  add column if not exists acrescimo_total numeric(15, 2);
alter table public.ordens_servico
  add column if not exists ordem_retorno_id uuid;
alter table public.ordens_servico
  add column if not exists tipo_abertura text;
alter table public.ordens_servico
  add column if not exists garantia_dias integer;
alter table public.ordens_servico
  add column if not exists aceite_entrega_em timestamptz;
alter table public.ordens_servico
  add column if not exists aceite_entrega_por uuid;
alter table public.ordens_servico
  add column if not exists faturado_em timestamptz;

-- Defaults seguros em colunas novas
update public.ordens_servico set prioridade = 'normal' where prioridade is null;
update public.ordens_servico set subtotal = 0 where subtotal is null;
update public.ordens_servico set desconto_total = 0 where desconto_total is null;
update public.ordens_servico set acrescimo_total = 0 where acrescimo_total is null;
update public.ordens_servico set tipo_abertura = 'normal' where tipo_abertura is null;

alter table public.ordens_servico alter column prioridade set default 'normal';
alter table public.ordens_servico alter column subtotal set default 0;
alter table public.ordens_servico alter column desconto_total set default 0;
alter table public.ordens_servico alter column acrescimo_total set default 0;
alter table public.ordens_servico alter column tipo_abertura set default 'normal';

do $$
begin
  begin
    alter table public.ordens_servico alter column prioridade set not null;
  exception when others then null;
  end;
  begin
    alter table public.ordens_servico alter column subtotal set not null;
  exception when others then null;
  end;
  begin
    alter table public.ordens_servico alter column desconto_total set not null;
  exception when others then null;
  end;
  begin
    alter table public.ordens_servico alter column acrescimo_total set not null;
  exception when others then null;
  end;
  begin
    alter table public.ordens_servico alter column tipo_abertura set not null;
  exception when others then null;
  end;
end $$;

-- FKs enterprise (somente se destino existir)
do $$
begin
  if to_regclass('public.profiles') is not null then
    if not exists (select 1 from pg_constraint where conname = 'ordens_servico_responsavel_recebimento_id_fkey') then
      begin
        alter table public.ordens_servico
          add constraint ordens_servico_responsavel_recebimento_id_fkey
          foreign key (responsavel_recebimento_id) references public.profiles (id) on delete set null;
      exception when others then null;
      end;
    end if;
    if not exists (select 1 from pg_constraint where conname = 'ordens_servico_consultor_id_fkey') then
      begin
        alter table public.ordens_servico
          add constraint ordens_servico_consultor_id_fkey
          foreign key (consultor_id) references public.profiles (id) on delete set null;
      exception when others then null;
      end;
    end if;
    if not exists (select 1 from pg_constraint where conname = 'ordens_servico_aceite_entrega_por_fkey') then
      begin
        alter table public.ordens_servico
          add constraint ordens_servico_aceite_entrega_por_fkey
          foreign key (aceite_entrega_por) references public.profiles (id) on delete set null;
      exception when others then null;
      end;
    end if;
  end if;

  if to_regclass('public.centros_custo') is not null
     and not exists (select 1 from pg_constraint where conname = 'ordens_servico_centro_custo_id_fkey') then
    begin
      alter table public.ordens_servico
        add constraint ordens_servico_centro_custo_id_fkey
        foreign key (centro_custo_id) references public.centros_custo (id) on delete set null;
    exception when others then null;
    end;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'ordens_servico_ordem_retorno_id_fkey') then
    begin
      alter table public.ordens_servico
        add constraint ordens_servico_ordem_retorno_id_fkey
        foreign key (ordem_retorno_id) references public.ordens_servico (id) on delete set null;
    exception when others then null;
    end;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'ordens_servico_status_check'
  ) then
    alter table public.ordens_servico
      add constraint ordens_servico_status_check
      check (status in (
        'rascunho',
        'aguardando_diagnostico',
        'diagnostico_concluido',
        'aguardando_orcamento',
        'aguardando_aprovacao',
        'aprovado',
        'parcialmente_aprovado',
        'em_execucao',
        'aguardando_peca',
        'aguardando_cliente',
        'pronto_para_entrega',
        'entregue',
        'faturado',
        'cancelado',
        'retorno',
        'garantia',
        -- legado (somente leitura / compat)
        'aberta',
        'concluida',
        'cancelada'
      ));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'ordens_servico_entrega_check'
  ) then
    alter table public.ordens_servico
      add constraint ordens_servico_entrega_check
      check (
        status not in ('entregue', 'faturado', 'concluida')
        or data_conclusao is not null
      );
  end if;
end $$;

create index if not exists idx_ordens_servico_tenant_id on public.ordens_servico (tenant_id);
create index if not exists idx_ordens_servico_cliente_id on public.ordens_servico (cliente_id);
create index if not exists idx_ordens_servico_veiculo_id on public.ordens_servico (veiculo_id);
create index if not exists idx_ordens_servico_status on public.ordens_servico (status);
create index if not exists idx_ordens_servico_data_conclusao on public.ordens_servico (data_conclusao desc);
create index if not exists idx_ordens_servico_deleted_at on public.ordens_servico (deleted_at);
create index if not exists idx_ordens_servico_venda_id
  on public.ordens_servico (venda_id)
  where venda_id is not null;
create index if not exists idx_ordens_servico_previsao
  on public.ordens_servico (tenant_id, previsao_entrega)
  where deleted_at is null;

create or replace function public.set_ordens_servico_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_ordens_servico_updated_at on public.ordens_servico;
create trigger trg_ordens_servico_updated_at
  before update on public.ordens_servico
  for each row execute function public.set_ordens_servico_updated_at();

alter table public.ordens_servico enable row level security;

drop policy if exists "Membros gerenciam ordens da empresa" on public.ordens_servico;
create policy "Membros gerenciam ordens da empresa"
  on public.ordens_servico for all
  using (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = ordens_servico.tenant_id and tm.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = ordens_servico.tenant_id and tm.user_id = auth.uid()
    )
  );

comment on table public.ordens_servico is 'Ordens de serviço operacionais — ciclo oficina 13.19';
comment on column public.ordens_servico.venda_id is 'Vínculo estável OS→venda após faturamento (motor existente).';

-- =============================================================================
-- 3) ITENS
-- =============================================================================
create table if not exists public.ordem_servico_itens (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  ordem_servico_id uuid not null references public.ordens_servico (id) on delete cascade,
  produto_id uuid,
  descricao text not null,
  tipo_item text not null default 'servico',
  mecanico_id uuid,
  quantidade numeric(15, 3) not null default 1,
  valor_unitario numeric(15, 2) not null default 0,
  valor_total numeric(15, 2) not null default 0,
  deleted_at timestamptz,
  created_at timestamptz not null default now()
);

do $$
begin
  if to_regclass('public.produtos') is not null
     and not exists (select 1 from pg_constraint where conname = 'ordem_servico_itens_produto_id_fkey') then
    begin
      alter table public.ordem_servico_itens
        add constraint ordem_servico_itens_produto_id_fkey
        foreign key (produto_id) references public.produtos (id) on delete set null;
    exception when others then null;
    end;
  end if;
  if to_regclass('public.profiles') is not null
     and not exists (select 1 from pg_constraint where conname = 'ordem_servico_itens_mecanico_id_fkey') then
    begin
      alter table public.ordem_servico_itens
        add constraint ordem_servico_itens_mecanico_id_fkey
        foreign key (mecanico_id) references public.profiles (id) on delete set null;
    exception when others then null;
    end;
  end if;
end $$;

alter table public.ordem_servico_itens
  add column if not exists updated_at timestamptz;
alter table public.ordem_servico_itens
  add column if not exists categoria_item text;
alter table public.ordem_servico_itens
  add column if not exists desconto numeric(15, 2);
alter table public.ordem_servico_itens
  add column if not exists acrescimo numeric(15, 2);
alter table public.ordem_servico_itens
  add column if not exists custo_unitario numeric(15, 2);
alter table public.ordem_servico_itens
  add column if not exists aprovacao_status text;
alter table public.ordem_servico_itens
  add column if not exists aprovacao_motivo text;
alter table public.ordem_servico_itens
  add column if not exists aprovacao_em timestamptz;
alter table public.ordem_servico_itens
  add column if not exists aprovacao_canal text;
alter table public.ordem_servico_itens
  add column if not exists estoque_status text;
alter table public.ordem_servico_itens
  add column if not exists peca_origem text;
alter table public.ordem_servico_itens
  add column if not exists fornecedor_sugerido_id uuid;
alter table public.ordem_servico_itens
  add column if not exists execucao_status text;
alter table public.ordem_servico_itens
  add column if not exists execucao_inicio timestamptz;
alter table public.ordem_servico_itens
  add column if not exists execucao_fim timestamptz;
alter table public.ordem_servico_itens
  add column if not exists horas_previstas numeric(8, 2);
alter table public.ordem_servico_itens
  add column if not exists horas_realizadas numeric(8, 2);
alter table public.ordem_servico_itens
  add column if not exists observacoes text;
alter table public.ordem_servico_itens
  add column if not exists prazo_peca text;
alter table public.ordem_servico_itens
  add column if not exists ordem integer;

update public.ordem_servico_itens set updated_at = coalesce(updated_at, now()) where updated_at is null;
update public.ordem_servico_itens set categoria_item = coalesce(categoria_item, 'servico');
update public.ordem_servico_itens set desconto = coalesce(desconto, 0);
update public.ordem_servico_itens set acrescimo = coalesce(acrescimo, 0);
update public.ordem_servico_itens set aprovacao_status = coalesce(aprovacao_status, 'pendente');
update public.ordem_servico_itens set estoque_status = coalesce(estoque_status, 'nao_aplicavel');
update public.ordem_servico_itens set peca_origem = coalesce(peca_origem, 'estoque');
update public.ordem_servico_itens set execucao_status = coalesce(execucao_status, 'pendente');
update public.ordem_servico_itens set ordem = coalesce(ordem, 0);

alter table public.ordem_servico_itens alter column updated_at set default now();
alter table public.ordem_servico_itens alter column categoria_item set default 'servico';
alter table public.ordem_servico_itens alter column desconto set default 0;
alter table public.ordem_servico_itens alter column acrescimo set default 0;
alter table public.ordem_servico_itens alter column aprovacao_status set default 'pendente';
alter table public.ordem_servico_itens alter column estoque_status set default 'nao_aplicavel';
alter table public.ordem_servico_itens alter column peca_origem set default 'estoque';
alter table public.ordem_servico_itens alter column execucao_status set default 'pendente';
alter table public.ordem_servico_itens alter column ordem set default 0;

do $$
begin
  begin alter table public.ordem_servico_itens alter column updated_at set not null; exception when others then null; end;
  begin alter table public.ordem_servico_itens alter column categoria_item set not null; exception when others then null; end;
  begin alter table public.ordem_servico_itens alter column desconto set not null; exception when others then null; end;
  begin alter table public.ordem_servico_itens alter column acrescimo set not null; exception when others then null; end;
  begin alter table public.ordem_servico_itens alter column aprovacao_status set not null; exception when others then null; end;
  begin alter table public.ordem_servico_itens alter column estoque_status set not null; exception when others then null; end;
  begin alter table public.ordem_servico_itens alter column peca_origem set not null; exception when others then null; end;
  begin alter table public.ordem_servico_itens alter column execucao_status set not null; exception when others then null; end;
  begin alter table public.ordem_servico_itens alter column ordem set not null; exception when others then null; end;
end $$;

do $$
begin
  if to_regclass('public.fornecedores') is not null
     and not exists (select 1 from pg_constraint where conname = 'ordem_servico_itens_fornecedor_sugerido_id_fkey') then
    begin
      alter table public.ordem_servico_itens
        add constraint ordem_servico_itens_fornecedor_sugerido_id_fkey
        foreign key (fornecedor_sugerido_id) references public.fornecedores (id) on delete set null;
    exception when others then null;
    end;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'ordem_servico_itens_aprovacao_check') then
    alter table public.ordem_servico_itens
      add constraint ordem_servico_itens_aprovacao_check
      check (aprovacao_status in ('pendente', 'aprovado', 'reprovado'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'ordem_servico_itens_estoque_check') then
    alter table public.ordem_servico_itens
      add constraint ordem_servico_itens_estoque_check
      check (estoque_status in (
        'nao_aplicavel', 'disponivel', 'reservado', 'separado',
        'consumido', 'devolvido', 'pendente_compra', 'fornecido_cliente'
      ));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'ordem_servico_itens_execucao_check') then
    alter table public.ordem_servico_itens
      add constraint ordem_servico_itens_execucao_check
      check (execucao_status in (
        'pendente', 'em_execucao', 'pausado', 'concluido', 'bloqueado', 'cancelado'
      ));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'ordem_servico_itens_categoria_check') then
    alter table public.ordem_servico_itens
      add constraint ordem_servico_itens_categoria_check
      check (categoria_item in ('peca', 'servico', 'mao_obra', 'outro'));
  end if;
end $$;

create index if not exists idx_ordem_servico_itens_tenant_id on public.ordem_servico_itens (tenant_id);
create index if not exists idx_ordem_servico_itens_ordem_id on public.ordem_servico_itens (ordem_servico_id);
create index if not exists idx_ordem_servico_itens_tipo on public.ordem_servico_itens (tipo_item);
create index if not exists idx_ordem_servico_itens_deleted_at on public.ordem_servico_itens (deleted_at);

alter table public.ordem_servico_itens enable row level security;

drop policy if exists "Membros gerenciam itens de ordem da empresa" on public.ordem_servico_itens;
create policy "Membros gerenciam itens de ordem da empresa"
  on public.ordem_servico_itens for all
  using (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = ordem_servico_itens.tenant_id and tm.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = ordem_servico_itens.tenant_id and tm.user_id = auth.uid()
    )
  );

comment on table public.ordem_servico_itens is 'Itens (peças, serviços, mão de obra) da OS — 13.19';

-- =============================================================================
-- 4) RETORNOS
-- =============================================================================
create table if not exists public.retornos_servico (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  numero bigint generated always as identity,
  ordem_servico_id uuid not null references public.ordens_servico (id) on delete restrict,
  cliente_id uuid not null references public.clientes (id) on delete restrict,
  veiculo_id uuid references public.veiculos (id) on delete set null,
  mecanico_id uuid,
  servico_produto_id uuid,
  categoria_id uuid,
  data_retorno date not null default current_date,
  data_servico_original date not null,
  motivo text not null,
  valor_retorno numeric(15, 2) not null default 0,
  valor_pecas_garantia numeric(15, 2) not null default 0,
  horas_mao_obra numeric(8, 2) not null default 0,
  valor_mao_obra numeric(15, 2) not null default 0,
  tipo_cobertura text not null default 'garantia',
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.retornos_servico
  add column if not exists tipo_retorno text;
alter table public.retornos_servico
  add column if not exists quilometragem numeric(12, 1);
alter table public.retornos_servico
  add column if not exists diagnostico text;
alter table public.retornos_servico
  add column if not exists conclusao text;
alter table public.retornos_servico
  add column if not exists item_id uuid;

update public.retornos_servico set tipo_retorno = coalesce(tipo_retorno, 'garantia');
alter table public.retornos_servico alter column tipo_retorno set default 'garantia';
do $$
begin
  begin alter table public.retornos_servico alter column tipo_retorno set not null; exception when others then null; end;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'retornos_servico_item_id_fkey') then
    begin
      alter table public.retornos_servico
        add constraint retornos_servico_item_id_fkey
        foreign key (item_id) references public.ordem_servico_itens (id) on delete set null;
    exception when others then null;
    end;
  end if;
end $$;

create index if not exists idx_retornos_servico_tenant_id on public.retornos_servico (tenant_id);
create index if not exists idx_retornos_servico_ordem_id on public.retornos_servico (ordem_servico_id);
create index if not exists idx_retornos_servico_data_retorno on public.retornos_servico (data_retorno desc);
create index if not exists idx_retornos_servico_deleted_at on public.retornos_servico (deleted_at);

create or replace function public.set_retornos_servico_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_retornos_servico_updated_at on public.retornos_servico;
create trigger trg_retornos_servico_updated_at
  before update on public.retornos_servico
  for each row execute function public.set_retornos_servico_updated_at();

alter table public.retornos_servico enable row level security;

drop policy if exists "Membros gerenciam retornos da empresa" on public.retornos_servico;
create policy "Membros gerenciam retornos da empresa"
  on public.retornos_servico for all
  using (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = retornos_servico.tenant_id and tm.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = retornos_servico.tenant_id and tm.user_id = auth.uid()
    )
  );

comment on table public.retornos_servico is 'Retornos / garantia / cortesia vinculados à OS original';

-- =============================================================================
-- 5) CHECKLIST
-- =============================================================================
create table if not exists public.ordem_servico_checklist (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  ordem_servico_id uuid not null references public.ordens_servico (id) on delete cascade,
  item_codigo text not null,
  item_label text not null,
  status text not null default 'ok'
    check (status in ('ok', 'atencao', 'danificado', 'ausente', 'na')),
  observacao text,
  responsavel_id uuid,
  registrado_em timestamptz not null default now(),
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  if to_regclass('public.profiles') is not null
     and not exists (select 1 from pg_constraint where conname = 'ordem_servico_checklist_responsavel_id_fkey') then
    begin
      alter table public.ordem_servico_checklist
        add constraint ordem_servico_checklist_responsavel_id_fkey
        foreign key (responsavel_id) references public.profiles (id) on delete set null;
    exception when others then null;
    end;
  end if;
end $$;

create index if not exists idx_os_checklist_ordem
  on public.ordem_servico_checklist (ordem_servico_id)
  where deleted_at is null;

alter table public.ordem_servico_checklist enable row level security;

drop policy if exists "Membros gerenciam checklist OS" on public.ordem_servico_checklist;
create policy "Membros gerenciam checklist OS"
  on public.ordem_servico_checklist for all
  using (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = ordem_servico_checklist.tenant_id and tm.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = ordem_servico_checklist.tenant_id and tm.user_id = auth.uid()
    )
  );

comment on table public.ordem_servico_checklist is 'Checklist de entrada/saída da OS (13.19).';

-- =============================================================================
-- 6) DIAGNÓSTICO
-- =============================================================================
create table if not exists public.ordem_servico_diagnosticos (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  ordem_servico_id uuid not null references public.ordens_servico (id) on delete cascade,
  sintoma_relatado text,
  diagnostico_tecnico text,
  causa_provavel text,
  recomendacao text,
  gravidade text,
  urgencia text,
  testes_realizados text,
  pecas_necessarias text,
  servicos_necessarios text,
  tecnico_id uuid,
  observacoes_internas text,
  registrado_em timestamptz not null default now(),
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'ordem_servico_diagnosticos_gravidade_check') then
    alter table public.ordem_servico_diagnosticos
      add constraint ordem_servico_diagnosticos_gravidade_check
      check (gravidade is null or gravidade in ('baixa', 'media', 'alta', 'critica'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'ordem_servico_diagnosticos_urgencia_check') then
    alter table public.ordem_servico_diagnosticos
      add constraint ordem_servico_diagnosticos_urgencia_check
      check (urgencia is null or urgencia in ('baixa', 'media', 'alta'));
  end if;
  if to_regclass('public.profiles') is not null
     and not exists (select 1 from pg_constraint where conname = 'ordem_servico_diagnosticos_tecnico_id_fkey') then
    begin
      alter table public.ordem_servico_diagnosticos
        add constraint ordem_servico_diagnosticos_tecnico_id_fkey
        foreign key (tecnico_id) references public.profiles (id) on delete set null;
    exception when others then null;
    end;
  end if;
end $$;

create index if not exists idx_os_diagnosticos_ordem
  on public.ordem_servico_diagnosticos (ordem_servico_id)
  where deleted_at is null;

alter table public.ordem_servico_diagnosticos enable row level security;

drop policy if exists "Membros gerenciam diagnosticos OS" on public.ordem_servico_diagnosticos;
create policy "Membros gerenciam diagnosticos OS"
  on public.ordem_servico_diagnosticos for all
  using (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = ordem_servico_diagnosticos.tenant_id and tm.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = ordem_servico_diagnosticos.tenant_id and tm.user_id = auth.uid()
    )
  );

comment on table public.ordem_servico_diagnosticos is 'Diagnóstico técnico — não gera financeiro.';

-- =============================================================================
-- 7) ANEXOS
-- =============================================================================
create table if not exists public.ordem_servico_anexos (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  ordem_servico_id uuid not null references public.ordens_servico (id) on delete cascade,
  item_id uuid references public.ordem_servico_itens (id) on delete set null,
  etapa text not null default 'entrada',
  tipo text not null default 'foto',
  descricao text,
  storage_path text,
  mime_type text,
  tamanho_bytes integer,
  user_id uuid,
  deleted_at timestamptz,
  created_at timestamptz not null default now()
);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'ordem_servico_anexos_etapa_check') then
    alter table public.ordem_servico_anexos
      add constraint ordem_servico_anexos_etapa_check
      check (etapa in (
        'entrada', 'diagnostico', 'orcamento', 'execucao',
        'conclusao', 'entrega', 'retorno', 'garantia', 'outro'
      ));
  end if;
  if to_regclass('public.profiles') is not null
     and not exists (select 1 from pg_constraint where conname = 'ordem_servico_anexos_user_id_fkey') then
    begin
      alter table public.ordem_servico_anexos
        add constraint ordem_servico_anexos_user_id_fkey
        foreign key (user_id) references public.profiles (id) on delete set null;
    exception when others then null;
    end;
  end if;
end $$;

create index if not exists idx_os_anexos_ordem
  on public.ordem_servico_anexos (ordem_servico_id)
  where deleted_at is null;

alter table public.ordem_servico_anexos enable row level security;

drop policy if exists "Membros gerenciam anexos OS" on public.ordem_servico_anexos;
create policy "Membros gerenciam anexos OS"
  on public.ordem_servico_anexos for all
  using (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = ordem_servico_anexos.tenant_id and tm.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = ordem_servico_anexos.tenant_id and tm.user_id = auth.uid()
    )
  );

comment on table public.ordem_servico_anexos is 'Metadados de fotos/anexos da OS.';

-- =============================================================================
-- 8) EVENTOS / TIMELINE
-- =============================================================================
create table if not exists public.ordem_servico_eventos (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  ordem_servico_id uuid not null references public.ordens_servico (id) on delete cascade,
  tipo text not null,
  descricao text not null,
  estado_anterior text,
  estado_posterior text,
  motivo text,
  entidade_tipo text,
  entidade_id uuid,
  user_id uuid,
  created_at timestamptz not null default now()
);

do $$
begin
  if to_regclass('public.profiles') is not null
     and not exists (select 1 from pg_constraint where conname = 'ordem_servico_eventos_user_id_fkey') then
    begin
      alter table public.ordem_servico_eventos
        add constraint ordem_servico_eventos_user_id_fkey
        foreign key (user_id) references public.profiles (id) on delete set null;
    exception when others then null;
    end;
  end if;
end $$;

create index if not exists idx_os_eventos_ordem
  on public.ordem_servico_eventos (ordem_servico_id, created_at desc);

alter table public.ordem_servico_eventos enable row level security;

drop policy if exists "Membros leem eventos OS" on public.ordem_servico_eventos;
create policy "Membros leem eventos OS"
  on public.ordem_servico_eventos for select
  using (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = ordem_servico_eventos.tenant_id and tm.user_id = auth.uid()
    )
  );

drop policy if exists "Membros inserem eventos OS" on public.ordem_servico_eventos;
create policy "Membros inserem eventos OS"
  on public.ordem_servico_eventos for insert
  with check (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = ordem_servico_eventos.tenant_id and tm.user_id = auth.uid()
    )
  );

comment on table public.ordem_servico_eventos is 'Timeline auditável da OS.';

-- =============================================================================
-- 9) HISTÓRICO DE PREVISÃO
-- =============================================================================
create table if not exists public.ordem_servico_previsoes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  ordem_servico_id uuid not null references public.ordens_servico (id) on delete cascade,
  previsao_anterior timestamptz,
  previsao_nova timestamptz not null,
  motivo text,
  user_id uuid,
  created_at timestamptz not null default now()
);

do $$
begin
  if to_regclass('public.profiles') is not null
     and not exists (select 1 from pg_constraint where conname = 'ordem_servico_previsoes_user_id_fkey') then
    begin
      alter table public.ordem_servico_previsoes
        add constraint ordem_servico_previsoes_user_id_fkey
        foreign key (user_id) references public.profiles (id) on delete set null;
    exception when others then null;
    end;
  end if;
end $$;

create index if not exists idx_os_previsoes_ordem
  on public.ordem_servico_previsoes (ordem_servico_id, created_at desc);

alter table public.ordem_servico_previsoes enable row level security;

drop policy if exists "Membros gerenciam previsoes OS" on public.ordem_servico_previsoes;
create policy "Membros gerenciam previsoes OS"
  on public.ordem_servico_previsoes for all
  using (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = ordem_servico_previsoes.tenant_id and tm.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = ordem_servico_previsoes.tenant_id and tm.user_id = auth.uid()
    )
  );

-- =============================================================================
-- 10) Reload PostgREST
-- =============================================================================
notify pgrst, 'reload schema';
