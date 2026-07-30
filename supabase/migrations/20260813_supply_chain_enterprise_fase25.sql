-- Fase 25 — Compras, Estoque e Cadeia de Suprimentos Enterprise (idempotente)
-- Aplicar MANUALMENTE no Supabase SQL Editor após revisão.
-- NÃO executar automaticamente pelo agente.
--
-- NÃO duplica: produtos, estoque_movimentacoes, fornecedores, contas_pagar,
-- notas_fiscais_entrada, clientes, vendas, OS, auditoria.
-- Extensões: campos enterprise em produtos/fornecedores/movimentações,
-- depósitos/almoxarifados/localizações, workflow de compras, inventário.

/* ─── 1. Extensão do cadastro ÚNICO de produtos ──────────────── */

alter table public.produtos
  add column if not exists descricao_resumida text,
  add column if not exists fabricante text,
  add column if not exists ncm text,
  add column if not exists cest text,
  add column if not exists origem_mercadoria text,
  add column if not exists peso_kg numeric(14, 4),
  add column if not exists dimensoes text,
  add column if not exists custo_reposicao numeric(14, 4),
  add column if not exists preco_minimo numeric(14, 4),
  add column if not exists margem_alvo numeric(8, 4),
  add column if not exists estoque_seguranca numeric(14, 4),
  add column if not exists fornecedor_alternativo text,
  add column if not exists fornecedor_principal_id uuid,
  add column if not exists fornecedor_alternativo_id uuid,
  add column if not exists empresa_id uuid,
  add column if not exists filial_id uuid;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'produtos_peso_kg_check'
  ) then
    alter table public.produtos
      add constraint produtos_peso_kg_check
      check (peso_kg is null or peso_kg >= 0);
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'produtos_preco_minimo_check'
  ) then
    alter table public.produtos
      add constraint produtos_preco_minimo_check
      check (preco_minimo is null or preco_minimo >= 0);
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'produtos_estoque_seguranca_check'
  ) then
    alter table public.produtos
      add constraint produtos_estoque_seguranca_check
      check (estoque_seguranca is null or estoque_seguranca >= 0);
  end if;
end $$;

create index if not exists idx_produtos_empresa
  on public.produtos (tenant_id, empresa_id)
  where deleted_at is null and empresa_id is not null;

create index if not exists idx_produtos_filial
  on public.produtos (tenant_id, filial_id)
  where deleted_at is null and filial_id is not null;

create index if not exists idx_produtos_ncm
  on public.produtos (tenant_id, ncm)
  where deleted_at is null and ncm is not null;

comment on column public.produtos.descricao_resumida is 'Descrição curta enterprise';
comment on column public.produtos.ncm is 'NCM fiscal';
comment on column public.produtos.cest is 'CEST fiscal';
comment on column public.produtos.empresa_id is 'Empresa lógica multiempresa';
comment on column public.produtos.filial_id is 'Filial lógica multifilial';

/* ─── 2. Fornecedores — desempenho / SLA (cadastro Finance) ─── */

alter table public.fornecedores
  add column if not exists lead_time_dias integer,
  add column if not exists sla_dias integer,
  add column if not exists ranking_interno text,
  add column if not exists qualidade_score numeric(5, 2),
  add column if not exists empresa_id uuid,
  add column if not exists filial_id uuid;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'fornecedores_lead_time_check'
  ) then
    alter table public.fornecedores
      add constraint fornecedores_lead_time_check
      check (lead_time_dias is null or lead_time_dias >= 0);
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'fornecedores_sla_check'
  ) then
    alter table public.fornecedores
      add constraint fornecedores_sla_check
      check (sla_dias is null or sla_dias >= 0);
  end if;
end $$;

/* ─── 3. Movimentações — tipos enterprise + depósito ─────────── */

alter table public.estoque_movimentacoes
  add column if not exists kind_enterprise text,
  add column if not exists deposito_origem_id uuid,
  add column if not exists deposito_destino_id uuid,
  add column if not exists localizacao_id uuid,
  add column if not exists documento_ref text,
  add column if not exists empresa_id uuid,
  add column if not exists filial_id uuid;

comment on column public.estoque_movimentacoes.kind_enterprise is
  'Taxonomia Fase 25 (entrada|saida|transferencia|ajuste|inventario|perda|devolucao|consumo_interno|reserva|separacao|expedicao)';

/* ─── 4. Depósitos / Almoxarifados / Localizações ────────────── */

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

create table if not exists public.estoque_almoxarifados (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  deposito_id uuid not null references public.estoque_depositos (id) on delete cascade,
  codigo text not null,
  nome text not null,
  ativo boolean not null default true,
  observacoes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (tenant_id, deposito_id, codigo)
);

create index if not exists idx_estoque_almox_deposito
  on public.estoque_almoxarifados (tenant_id, deposito_id)
  where deleted_at is null;

create table if not exists public.estoque_localizacoes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  deposito_id uuid not null references public.estoque_depositos (id) on delete cascade,
  almoxarifado_id uuid references public.estoque_almoxarifados (id) on delete set null,
  rua text,
  corredor text,
  prateleira text,
  posicao text,
  codigo text not null,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (tenant_id, codigo)
);

create index if not exists idx_estoque_loc_deposito
  on public.estoque_localizacoes (tenant_id, deposito_id)
  where deleted_at is null;

/* ─── 5. Workflow de compras ─────────────────────────────────── */

create table if not exists public.compras_pedidos (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  empresa_id uuid,
  filial_id uuid,
  numero integer,
  status text not null default 'rascunho',
  fornecedor_id uuid references public.fornecedores (id) on delete set null,
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
  deleted_at timestamptz,
  constraint compras_pedidos_status_check check (
    status in (
      'rascunho','solicitacao','aprovacao','cotacao','comparacao',
      'pedido','recebimento','conferencia','integrado','cancelado'
    )
  )
);

create index if not exists idx_compras_pedidos_tenant_status
  on public.compras_pedidos (tenant_id, status)
  where deleted_at is null;

create table if not exists public.compras_pedido_itens (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  pedido_id uuid not null references public.compras_pedidos (id) on delete cascade,
  produto_id uuid not null references public.produtos (id) on delete restrict,
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
  fornecedor_id uuid references public.fornecedores (id) on delete set null,
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

/* ─── 6. Inventário ──────────────────────────────────────────── */

create table if not exists public.estoque_inventarios (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  empresa_id uuid,
  filial_id uuid,
  deposito_id uuid references public.estoque_depositos (id) on delete set null,
  kind text not null default 'rotativo',
  status text not null default 'aberto',
  observacoes text,
  created_by uuid references public.profiles (id) on delete set null,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint estoque_inventarios_kind_check check (kind in ('rotativo', 'geral')),
  constraint estoque_inventarios_status_check check (
    status in ('aberto','em_conferencia','divergencias','ajustado','fechado','cancelado')
  )
);

create index if not exists idx_estoque_inventarios_tenant
  on public.estoque_inventarios (tenant_id, status)
  where deleted_at is null;

create table if not exists public.estoque_inventario_itens (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  inventario_id uuid not null references public.estoque_inventarios (id) on delete cascade,
  produto_id uuid not null references public.produtos (id) on delete restrict,
  saldo_sistema numeric(14, 4) not null,
  contagem numeric(14, 4),
  divergencia numeric(14, 4),
  ajustado boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_estoque_inv_itens
  on public.estoque_inventario_itens (tenant_id, inventario_id);

/* ─── 7. RLS (membro do tenant — padrão Fase 24) ─────────────── */

alter table public.estoque_depositos enable row level security;
alter table public.estoque_almoxarifados enable row level security;
alter table public.estoque_localizacoes enable row level security;
alter table public.compras_pedidos enable row level security;
alter table public.compras_pedido_itens enable row level security;
alter table public.compras_cotacoes enable row level security;
alter table public.compras_eventos enable row level security;
alter table public.estoque_inventarios enable row level security;
alter table public.estoque_inventario_itens enable row level security;

drop policy if exists "Membros gerenciam depositos" on public.estoque_depositos;
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

drop policy if exists "Membros gerenciam almoxarifados" on public.estoque_almoxarifados;
create policy "Membros gerenciam almoxarifados"
  on public.estoque_almoxarifados for all
  using (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = estoque_almoxarifados.tenant_id and tm.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = estoque_almoxarifados.tenant_id and tm.user_id = auth.uid()
    )
  );

drop policy if exists "Membros gerenciam localizacoes" on public.estoque_localizacoes;
create policy "Membros gerenciam localizacoes"
  on public.estoque_localizacoes for all
  using (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = estoque_localizacoes.tenant_id and tm.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = estoque_localizacoes.tenant_id and tm.user_id = auth.uid()
    )
  );

drop policy if exists "Membros gerenciam compras_pedidos" on public.compras_pedidos;
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

drop policy if exists "Membros gerenciam compras_pedido_itens" on public.compras_pedido_itens;
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

drop policy if exists "Membros gerenciam compras_cotacoes" on public.compras_cotacoes;
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

drop policy if exists "Membros gerenciam compras_eventos" on public.compras_eventos;
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

drop policy if exists "Membros gerenciam inventarios" on public.estoque_inventarios;
create policy "Membros gerenciam inventarios"
  on public.estoque_inventarios for all
  using (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = estoque_inventarios.tenant_id and tm.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = estoque_inventarios.tenant_id and tm.user_id = auth.uid()
    )
  );

drop policy if exists "Membros gerenciam inventario_itens" on public.estoque_inventario_itens;
create policy "Membros gerenciam inventario_itens"
  on public.estoque_inventario_itens for all
  using (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = estoque_inventario_itens.tenant_id and tm.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = estoque_inventario_itens.tenant_id and tm.user_id = auth.uid()
    )
  );

comment on table public.estoque_depositos is 'Fase 25 — depósitos multiempresa/multifilial';
comment on table public.compras_pedidos is 'Fase 25 — workflow de compras; integra Finance/Estoque no status integrado';
comment on table public.estoque_inventarios is 'Fase 25 — inventário rotativo/geral';

/* ═══════════════════════════════════════════════════════════════
   Sprint 25.1 — Correções (idempotente) sobre a mesma migration
   ═══════════════════════════════════════════════════════════════ */

/* Produtos — dimensões, controles e tipos enterprise */
alter table public.produtos
  add column if not exists altura_cm numeric(14, 4),
  add column if not exists largura_cm numeric(14, 4),
  add column if not exists comprimento_cm numeric(14, 4),
  add column if not exists controla_estoque boolean not null default true,
  add column if not exists controla_lote boolean not null default false,
  add column if not exists controla_serie boolean not null default false,
  add column if not exists controla_validade boolean not null default false;

do $$
begin
  -- Amplia tipos canônicos (legado + enterprise)
  if exists (
    select 1 from pg_constraint where conname = 'produtos_tipo_check'
  ) then
    alter table public.produtos drop constraint produtos_tipo_check;
  end if;
  alter table public.produtos
    add constraint produtos_tipo_check
    check (tipo in (
      'produto','servico','kit','combo','materia_prima',
      'peca','composto','ativo_consumo'
    ));
exception
  when others then
    -- Se constraint tiver outro nome, tenta recriar de forma segura
    null;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'produtos_dimensoes_check'
  ) then
    alter table public.produtos
      add constraint produtos_dimensoes_check
      check (
        (altura_cm is null or altura_cm >= 0)
        and (largura_cm is null or largura_cm >= 0)
        and (comprimento_cm is null or comprimento_cm >= 0)
      );
  end if;
end $$;

-- Serviço não controla estoque por padrão (trigger leve via check app; default true permanece)

create unique index if not exists produtos_tenant_sku_unique
  on public.produtos (tenant_id, sku)
  where deleted_at is null and sku is not null and btrim(sku) <> '';

create unique index if not exists produtos_tenant_codigo_barras_unique
  on public.produtos (tenant_id, codigo_barras)
  where deleted_at is null and codigo_barras is not null and btrim(codigo_barras) <> '';

create unique index if not exists produtos_tenant_codigo_interno_unique
  on public.produtos (tenant_id, codigo_interno)
  where deleted_at is null and codigo_interno is not null and btrim(codigo_interno) <> '';

/* FKs opcionais fornecedor ↔ produto */
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'produtos_fornecedor_principal_id_fkey'
  ) then
    alter table public.produtos
      add constraint produtos_fornecedor_principal_id_fkey
      foreign key (fornecedor_principal_id) references public.fornecedores (id)
      on delete set null;
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'produtos_fornecedor_alternativo_id_fkey'
  ) then
    alter table public.produtos
      add constraint produtos_fornecedor_alternativo_id_fkey
      foreign key (fornecedor_alternativo_id) references public.fornecedores (id)
      on delete set null;
  end if;
end $$;

/* Movimentações — check kind_enterprise + FKs depósito */
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'estoque_mov_kind_enterprise_check'
  ) then
    alter table public.estoque_movimentacoes
      add constraint estoque_mov_kind_enterprise_check
      check (
        kind_enterprise is null or kind_enterprise in (
          'entrada','saida','transferencia','ajuste','inventario','perda',
          'devolucao','consumo_interno','reserva','separacao','expedicao',
          'liberacao_reserva'
        )
      );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'estoque_mov_deposito_origem_fkey'
  ) then
    alter table public.estoque_movimentacoes
      add constraint estoque_mov_deposito_origem_fkey
      foreign key (deposito_origem_id) references public.estoque_depositos (id)
      on delete set null;
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'estoque_mov_deposito_destino_fkey'
  ) then
    alter table public.estoque_movimentacoes
      add constraint estoque_mov_deposito_destino_fkey
      foreign key (deposito_destino_id) references public.estoque_depositos (id)
      on delete set null;
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'estoque_mov_localizacao_fkey'
  ) then
    alter table public.estoque_movimentacoes
      add constraint estoque_mov_localizacao_fkey
      foreign key (localizacao_id) references public.estoque_localizacoes (id)
      on delete set null;
  end if;
end $$;

alter table public.estoque_movimentacoes
  add column if not exists correlation_id uuid,
  add column if not exists idempotency_key text;

create unique index if not exists estoque_mov_idempotency_unique
  on public.estoque_movimentacoes (tenant_id, idempotency_key)
  where deleted_at is null and idempotency_key is not null;

/* Pedidos — número único por tenant */
create unique index if not exists compras_pedidos_tenant_numero_unique
  on public.compras_pedidos (tenant_id, numero)
  where deleted_at is null and numero is not null;

/* Cotação — itens linha a linha */
create table if not exists public.compras_cotacao_itens (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  cotacao_id uuid not null references public.compras_cotacoes (id) on delete cascade,
  produto_id uuid not null references public.produtos (id) on delete restrict,
  quantidade numeric(14, 4) not null,
  preco_unitario numeric(14, 4),
  prazo_dias integer,
  frete numeric(14, 2),
  impostos numeric(14, 2),
  observacoes text,
  created_at timestamptz not null default now(),
  constraint compras_cotacao_itens_qty_check check (quantidade > 0)
);

create index if not exists idx_compras_cotacao_itens
  on public.compras_cotacao_itens (tenant_id, cotacao_id);

/* Recebimentos */
create table if not exists public.compras_recebimentos (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  pedido_id uuid not null references public.compras_pedidos (id) on delete cascade,
  deposito_id uuid references public.estoque_depositos (id) on delete set null,
  localizacao_id uuid references public.estoque_localizacoes (id) on delete set null,
  status text not null default 'conferencia',
  nota_fiscal_ref text,
  divergencia boolean not null default false,
  observacoes text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  confirmed_at timestamptz,
  deleted_at timestamptz,
  constraint compras_recebimentos_status_check check (
    status in ('conferencia','aceito_parcial','aceito_total','recusado')
  )
);

create index if not exists idx_compras_recebimentos_pedido
  on public.compras_recebimentos (tenant_id, pedido_id)
  where deleted_at is null;

create table if not exists public.compras_recebimento_itens (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  recebimento_id uuid not null references public.compras_recebimentos (id) on delete cascade,
  pedido_item_id uuid references public.compras_pedido_itens (id) on delete set null,
  produto_id uuid not null references public.produtos (id) on delete restrict,
  quantidade_pedida numeric(14, 4) not null,
  quantidade_recebida numeric(14, 4) not null,
  lote text,
  serie text,
  validade date,
  avaria boolean not null default false,
  created_at timestamptz not null default now(),
  constraint compras_recebimento_itens_qty_check check (
    quantidade_pedida >= 0 and quantidade_recebida >= 0
  )
);

create index if not exists idx_compras_recebimento_itens
  on public.compras_recebimento_itens (tenant_id, recebimento_id);

/* Reservas de estoque (saldo físico intacto) */
create table if not exists public.estoque_reservas (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  produto_id uuid not null references public.produtos (id) on delete restrict,
  quantidade numeric(14, 4) not null,
  origem text not null,
  origem_id uuid,
  status text not null default 'ativa',
  expires_at timestamptz,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  released_at timestamptz,
  deleted_at timestamptz,
  constraint estoque_reservas_qty_check check (quantidade > 0),
  constraint estoque_reservas_status_check check (
    status in ('ativa','consumida','liberada','expirada','cancelada')
  )
);

create index if not exists idx_estoque_reservas_produto
  on public.estoque_reservas (tenant_id, produto_id, status)
  where deleted_at is null;

/* Vínculo Finance Core — idempotência AP ↔ pedido */
alter table public.contas_pagar
  add column if not exists compra_pedido_id uuid;

create unique index if not exists contas_pagar_compra_pedido_unique
  on public.contas_pagar (tenant_id, compra_pedido_id)
  where deleted_at is null and compra_pedido_id is not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'contas_pagar_compra_pedido_fkey'
  ) then
    alter table public.contas_pagar
      add constraint contas_pagar_compra_pedido_fkey
      foreign key (compra_pedido_id) references public.compras_pedidos (id)
      on delete set null;
  end if;
end $$;

/* RLS novas tabelas */
alter table public.compras_cotacao_itens enable row level security;
alter table public.compras_recebimentos enable row level security;
alter table public.compras_recebimento_itens enable row level security;
alter table public.estoque_reservas enable row level security;

drop policy if exists "Membros gerenciam compras_cotacao_itens" on public.compras_cotacao_itens;
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

drop policy if exists "Membros gerenciam compras_recebimentos" on public.compras_recebimentos;
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

drop policy if exists "Membros gerenciam compras_recebimento_itens" on public.compras_recebimento_itens;
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

drop policy if exists "Membros gerenciam estoque_reservas" on public.estoque_reservas;
create policy "Membros gerenciam estoque_reservas"
  on public.estoque_reservas for all
  using (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = estoque_reservas.tenant_id and tm.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = estoque_reservas.tenant_id and tm.user_id = auth.uid()
    )
  );

comment on table public.compras_cotacao_itens is 'Sprint 25.1 — itens de cotação (comparação sem inventar impostos/frete)';
comment on table public.compras_recebimentos is 'Sprint 25.1 — recebimento/conferência de pedidos';
comment on table public.estoque_reservas is 'Sprint 25.1 — reserva não reduz saldo físico';
comment on column public.contas_pagar.compra_pedido_id is 'Sprint 25.1 — vínculo idempotente pedido→AP (Finance Core)';
