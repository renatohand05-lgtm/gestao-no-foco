-- =============================================================================
-- Sprint 29.10 — ENSURE CRM + Compras (idempotente · defensivo)
--
-- Causa raiz (Sprint 29.9):
--   1) Create de cliente/lead falhou com "coluna ausente" / schema cache —
--      payload de create usa colunas de 20260812 (valor_estimado, etc.).
--   2) UI Compras mostrou "Schema pendente" — probe exige public.compras_pedidos
--      (criada por 20260813_supply_chain_enterprise_fase25.sql).
--
-- Este arquivo NÃO substitui as migrations canônicas:
--   - 20260726_crm_enterprise.sql
--   - 20260812_crm_enterprise_fase24.sql
--   - 20260802_phase28_crm_rbac_fields.sql
--   - 20260813_supply_chain_enterprise_fase25.sql
-- Ele apenas REAPLICA de forma segura o mínimo crítico se o ambiente
-- ficou parcial / nunca aplicado.
--
-- Seguro reexecutar do início.
-- NÃO executar automaticamente — aplicar MANUALMENTE no SQL Editor após backup.
-- =============================================================================

/* ─── A. CRM — colunas em public.clientes usadas pelo create/update ─────── */

do $$
begin
  if to_regclass('public.clientes') is null then
    raise notice '29.10: public.clientes ausente — abortando bloco CRM clientes.';
    return;
  end if;

  -- Sprint 14 / 20260726
  alter table public.clientes add column if not exists classificacao text;
  alter table public.clientes add column if not exists score numeric(5, 2) not null default 0;
  alter table public.clientes add column if not exists consultor_id uuid;
  alter table public.clientes add column if not exists estagio_funil text not null default 'lead';

  -- Fase 24 / 20260812 — causa direta do create com valor_estimado no form
  alter table public.clientes add column if not exists empresa_id uuid;
  alter table public.clientes add column if not exists filial_id uuid;
  alter table public.clientes add column if not exists nome_fantasia text;
  alter table public.clientes add column if not exists ie_rg text;
  alter table public.clientes add column if not exists valor_estimado numeric(14, 2);
  alter table public.clientes add column if not exists probabilidade integer;
  alter table public.clientes add column if not exists data_prevista_fechamento date;
  alter table public.clientes add column if not exists data_fechamento date;
  alter table public.clientes add column if not exists motivo_perda text;

  -- Fase 28.1 / 20260802
  alter table public.clientes add column if not exists consentimento_contato boolean not null default false;
  alter table public.clientes add column if not exists origem_contato_detalhe text;
  alter table public.clientes add column if not exists prioridade_crm text;
  alter table public.clientes add column if not exists valor_potencial numeric(14, 2);
  alter table public.clientes add column if not exists proxima_acao text;
  alter table public.clientes add column if not exists data_proxima_acao date;
end $$;

do $$
begin
  if to_regclass('public.clientes') is null then
    return;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'clientes_probabilidade_check'
  ) and exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'clientes' and column_name = 'probabilidade'
  ) then
    alter table public.clientes
      add constraint clientes_probabilidade_check
      check (probabilidade is null or (probabilidade >= 0 and probabilidade <= 100));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'clientes_valor_estimado_check'
  ) and exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'clientes' and column_name = 'valor_estimado'
  ) then
    alter table public.clientes
      add constraint clientes_valor_estimado_check
      check (valor_estimado is null or valor_estimado >= 0);
  end if;
end $$;

create index if not exists idx_clientes_estagio_funil
  on public.clientes (tenant_id, estagio_funil)
  where deleted_at is null;

create index if not exists idx_clientes_empresa
  on public.clientes (tenant_id, empresa_id)
  where deleted_at is null and empresa_id is not null;

create index if not exists idx_clientes_filial
  on public.clientes (tenant_id, filial_id)
  where deleted_at is null and filial_id is not null;

comment on column public.clientes.valor_estimado is
  '29.10 ensure — valor estimado da oportunidade no funil (Fase 24).';
comment on column public.clientes.consentimento_contato is
  '29.10 ensure — consentimento LGPD/contato (Fase 28.1).';

/* ─── B. CRM — crm_oportunidades (self-heal mínimo) ─────────────────────── */

create table if not exists public.crm_oportunidades (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  cliente_id uuid not null references public.clientes (id) on delete cascade,
  empresa_id uuid,
  filial_id uuid,
  titulo text not null,
  stage_key text not null default 'lead',
  valor_estimado numeric(14, 2)
    check (valor_estimado is null or valor_estimado >= 0),
  probabilidade integer
    check (probabilidade is null or (probabilidade >= 0 and probabilidade <= 100)),
  data_prevista date,
  data_fechamento date,
  origem text,
  responsavel_id uuid references public.profiles (id) on delete set null,
  produto_servico text,
  status text not null default 'aberta'
    check (status in ('aberta', 'ganha', 'perdida', 'cancelada')),
  motivo_perda text,
  centro_custo_id uuid,
  tags text[],
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

do $$
begin
  if to_regclass('public.crm_oportunidades') is null then
    return;
  end if;
  alter table public.crm_oportunidades add column if not exists centro_custo_id uuid;
  alter table public.crm_oportunidades add column if not exists tags text[];
end $$;

alter table public.crm_oportunidades enable row level security;

do $$
begin
  if to_regclass('public.crm_oportunidades') is null then
    return;
  end if;
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'crm_oportunidades'
      and policyname = 'Membros gerenciam oportunidades CRM'
  ) then
    create policy "Membros gerenciam oportunidades CRM"
      on public.crm_oportunidades for all
      using (
        exists (
          select 1 from public.tenant_members tm
          where tm.tenant_id = crm_oportunidades.tenant_id
            and tm.user_id = auth.uid()
        )
      )
      with check (
        exists (
          select 1 from public.tenant_members tm
          where tm.tenant_id = crm_oportunidades.tenant_id
            and tm.user_id = auth.uid()
        )
      );
  end if;
end $$;

/* ─── C. Compras — núcleo exigido pelo probePurchaseSchema ──────────────── */

create table if not exists public.estoque_depositos (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  empresa_id uuid,
  filial_id uuid,
  codigo text not null,
  nome text not null,
  ativo boolean not null default true,
  observacoes text,
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (tenant_id, codigo)
);

create index if not exists idx_estoque_depositos_tenant
  on public.estoque_depositos (tenant_id)
  where deleted_at is null;

create table if not exists public.compras_pedidos (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  empresa_id uuid,
  filial_id uuid,
  numero integer,
  status text not null default 'rascunho',
  fornecedor_id uuid,
  solicitante_id uuid references public.profiles (id) on delete set null,
  aprovador_id uuid references public.profiles (id) on delete set null,
  data_necessidade date,
  valor_total numeric(14, 2),
  observacoes text,
  motivo_cancelamento text,
  integrado_financeiro_em timestamptz,
  integrado_estoque_em timestamptz,
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

do $$
begin
  if to_regclass('public.compras_pedidos') is null then
    return;
  end if;

  if to_regclass('public.fornecedores') is not null
     and exists (
       select 1 from information_schema.columns
       where table_schema = 'public' and table_name = 'compras_pedidos'
         and column_name = 'fornecedor_id'
     )
     and not exists (
       select 1 from pg_constraint where conname = 'compras_pedidos_fornecedor_fk'
     )
  then
    begin
      alter table public.compras_pedidos
        add constraint compras_pedidos_fornecedor_fk
        foreign key (fornecedor_id)
        references public.fornecedores (id)
        on delete set null;
    exception when others then
      raise notice '29.10: FK compras_pedidos_fornecedor_fk não aplicada: %', sqlerrm;
    end;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'compras_pedidos_status_check'
  ) then
    begin
      alter table public.compras_pedidos
        add constraint compras_pedidos_status_check
        check (
          status in (
            'rascunho','solicitacao','aprovacao','cotacao','comparacao',
            'pedido','recebimento','conferencia','integrado','cancelado'
          )
        );
    exception when others then
      raise notice '29.10: check compras_pedidos_status_check não aplicado: %', sqlerrm;
    end;
  end if;
end $$;

create index if not exists idx_compras_pedidos_tenant_status
  on public.compras_pedidos (tenant_id, status)
  where deleted_at is null;

create unique index if not exists compras_pedidos_tenant_numero_unique
  on public.compras_pedidos (tenant_id, numero)
  where numero is not null and deleted_at is null;

create table if not exists public.compras_pedido_itens (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  pedido_id uuid not null references public.compras_pedidos (id) on delete cascade,
  produto_id uuid not null,
  quantidade numeric(14, 4) not null,
  quantidade_recebida numeric(14, 4) not null default 0,
  preco_unitario numeric(14, 4),
  observacoes text,
  created_at timestamptz not null default now(),
  constraint compras_pedido_itens_qty_check check (quantidade > 0)
);

create index if not exists idx_compras_itens_pedido
  on public.compras_pedido_itens (tenant_id, pedido_id);

create table if not exists public.compras_cotacoes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  pedido_id uuid not null references public.compras_pedidos (id) on delete cascade,
  fornecedor_id uuid,
  valor_total numeric(14, 2),
  prazo_dias integer,
  escolhida boolean not null default false,
  observacoes text,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists idx_compras_cotacoes_pedido
  on public.compras_cotacoes (tenant_id, pedido_id)
  where deleted_at is null;

create table if not exists public.compras_eventos (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  pedido_id uuid not null references public.compras_pedidos (id) on delete cascade,
  from_status text,
  to_status text not null,
  nota text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_compras_eventos_pedido
  on public.compras_eventos (tenant_id, pedido_id, created_at desc);

create table if not exists public.compras_cotacao_itens (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  cotacao_id uuid not null references public.compras_cotacoes (id) on delete cascade,
  produto_id uuid,
  quantidade numeric(14, 4) not null default 1,
  preco_unitario numeric(14, 4),
  observacoes text,
  created_at timestamptz not null default now(),
  constraint compras_cotacao_itens_qty_check check (quantidade > 0)
);

create index if not exists idx_compras_cotacao_itens
  on public.compras_cotacao_itens (tenant_id, cotacao_id);

create table if not exists public.compras_recebimentos (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  pedido_id uuid not null references public.compras_pedidos (id) on delete cascade,
  deposito_id uuid references public.estoque_depositos (id) on delete set null,
  status text not null default 'aberto',
  observacoes text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists idx_compras_recebimentos_pedido
  on public.compras_recebimentos (tenant_id, pedido_id)
  where deleted_at is null;

create table if not exists public.compras_recebimento_itens (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  recebimento_id uuid not null references public.compras_recebimentos (id) on delete cascade,
  pedido_item_id uuid references public.compras_pedido_itens (id) on delete set null,
  quantidade numeric(14, 4) not null default 0,
  quantidade_divergente numeric(14, 4),
  observacoes text,
  created_at timestamptz not null default now()
);

create index if not exists idx_compras_recebimento_itens
  on public.compras_recebimento_itens (tenant_id, recebimento_id);

/* ─── D. RLS Compras / depósitos ────────────────────────────────────────── */

alter table public.estoque_depositos enable row level security;
alter table public.compras_pedidos enable row level security;
alter table public.compras_pedido_itens enable row level security;
alter table public.compras_cotacoes enable row level security;
alter table public.compras_eventos enable row level security;
alter table public.compras_cotacao_itens enable row level security;
alter table public.compras_recebimentos enable row level security;
alter table public.compras_recebimento_itens enable row level security;

do $$
begin
  if to_regclass('public.estoque_depositos') is not null
     and not exists (
       select 1 from pg_policies
       where schemaname = 'public' and tablename = 'estoque_depositos'
         and policyname = 'Membros gerenciam depositos'
     )
  then
    create policy "Membros gerenciam depositos"
      on public.estoque_depositos for all
      using (
        exists (
          select 1 from public.tenant_members tm
          where tm.tenant_id = estoque_depositos.tenant_id and tm.user_id = auth.uid()
        )
      )
      with check (
        exists (
          select 1 from public.tenant_members tm
          where tm.tenant_id = estoque_depositos.tenant_id and tm.user_id = auth.uid()
        )
      );
  end if;

  if to_regclass('public.compras_pedidos') is not null
     and not exists (
       select 1 from pg_policies
       where schemaname = 'public' and tablename = 'compras_pedidos'
         and policyname = 'Membros gerenciam compras_pedidos'
     )
  then
    create policy "Membros gerenciam compras_pedidos"
      on public.compras_pedidos for all
      using (
        exists (
          select 1 from public.tenant_members tm
          where tm.tenant_id = compras_pedidos.tenant_id and tm.user_id = auth.uid()
        )
      )
      with check (
        exists (
          select 1 from public.tenant_members tm
          where tm.tenant_id = compras_pedidos.tenant_id and tm.user_id = auth.uid()
        )
      );
  end if;

  if to_regclass('public.compras_pedido_itens') is not null
     and not exists (
       select 1 from pg_policies
       where schemaname = 'public' and tablename = 'compras_pedido_itens'
         and policyname = 'Membros gerenciam compras_pedido_itens'
     )
  then
    create policy "Membros gerenciam compras_pedido_itens"
      on public.compras_pedido_itens for all
      using (
        exists (
          select 1 from public.tenant_members tm
          where tm.tenant_id = compras_pedido_itens.tenant_id and tm.user_id = auth.uid()
        )
      )
      with check (
        exists (
          select 1 from public.tenant_members tm
          where tm.tenant_id = compras_pedido_itens.tenant_id and tm.user_id = auth.uid()
        )
      );
  end if;

  if to_regclass('public.compras_cotacoes') is not null
     and not exists (
       select 1 from pg_policies
       where schemaname = 'public' and tablename = 'compras_cotacoes'
         and policyname = 'Membros gerenciam compras_cotacoes'
     )
  then
    create policy "Membros gerenciam compras_cotacoes"
      on public.compras_cotacoes for all
      using (
        exists (
          select 1 from public.tenant_members tm
          where tm.tenant_id = compras_cotacoes.tenant_id and tm.user_id = auth.uid()
        )
      )
      with check (
        exists (
          select 1 from public.tenant_members tm
          where tm.tenant_id = compras_cotacoes.tenant_id and tm.user_id = auth.uid()
        )
      );
  end if;

  if to_regclass('public.compras_eventos') is not null
     and not exists (
       select 1 from pg_policies
       where schemaname = 'public' and tablename = 'compras_eventos'
         and policyname = 'Membros gerenciam compras_eventos'
     )
  then
    create policy "Membros gerenciam compras_eventos"
      on public.compras_eventos for all
      using (
        exists (
          select 1 from public.tenant_members tm
          where tm.tenant_id = compras_eventos.tenant_id and tm.user_id = auth.uid()
        )
      )
      with check (
        exists (
          select 1 from public.tenant_members tm
          where tm.tenant_id = compras_eventos.tenant_id and tm.user_id = auth.uid()
        )
      );
  end if;

  if to_regclass('public.compras_cotacao_itens') is not null
     and not exists (
       select 1 from pg_policies
       where schemaname = 'public' and tablename = 'compras_cotacao_itens'
         and policyname = 'Membros gerenciam compras_cotacao_itens'
     )
  then
    create policy "Membros gerenciam compras_cotacao_itens"
      on public.compras_cotacao_itens for all
      using (
        exists (
          select 1 from public.tenant_members tm
          where tm.tenant_id = compras_cotacao_itens.tenant_id and tm.user_id = auth.uid()
        )
      )
      with check (
        exists (
          select 1 from public.tenant_members tm
          where tm.tenant_id = compras_cotacao_itens.tenant_id and tm.user_id = auth.uid()
        )
      );
  end if;

  if to_regclass('public.compras_recebimentos') is not null
     and not exists (
       select 1 from pg_policies
       where schemaname = 'public' and tablename = 'compras_recebimentos'
         and policyname = 'Membros gerenciam compras_recebimentos'
     )
  then
    create policy "Membros gerenciam compras_recebimentos"
      on public.compras_recebimentos for all
      using (
        exists (
          select 1 from public.tenant_members tm
          where tm.tenant_id = compras_recebimentos.tenant_id and tm.user_id = auth.uid()
        )
      )
      with check (
        exists (
          select 1 from public.tenant_members tm
          where tm.tenant_id = compras_recebimentos.tenant_id and tm.user_id = auth.uid()
        )
      );
  end if;

  if to_regclass('public.compras_recebimento_itens') is not null
     and not exists (
       select 1 from pg_policies
       where schemaname = 'public' and tablename = 'compras_recebimento_itens'
         and policyname = 'Membros gerenciam compras_recebimento_itens'
     )
  then
    create policy "Membros gerenciam compras_recebimento_itens"
      on public.compras_recebimento_itens for all
      using (
        exists (
          select 1 from public.tenant_members tm
          where tm.tenant_id = compras_recebimento_itens.tenant_id and tm.user_id = auth.uid()
        )
      )
      with check (
        exists (
          select 1 from public.tenant_members tm
          where tm.tenant_id = compras_recebimento_itens.tenant_id and tm.user_id = auth.uid()
        )
      );
  end if;
end $$;

comment on table public.compras_pedidos is
  '29.10 ensure — workflow de compras (canônico Fase 25).';
comment on table public.crm_oportunidades is
  '29.10 ensure — oportunidades CRM (canônico Fase 24 / 28).';

/* ─── E. Verificação pós-ensure (notices apenas) ────────────────────────── */

do $$
declare
  missing text := '';
begin
  if to_regclass('public.clientes') is null then
    missing := missing || ' clientes';
  elsif not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'clientes' and column_name = 'valor_estimado'
  ) then
    missing := missing || ' clientes.valor_estimado';
  end if;

  if to_regclass('public.compras_pedidos') is null then
    missing := missing || ' compras_pedidos';
  end if;

  if missing = '' then
    raise notice '29.10 ENSURE OK — CRM create columns + compras_pedidos presentes.';
  else
    raise warning '29.10 ENSURE incompleto:%', missing;
  end if;
end $$;
