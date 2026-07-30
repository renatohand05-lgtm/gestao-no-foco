-- Sprint 25.4.3 — Ledgers de lote/série/validade + extensões inventário/NF-e
-- Idempotente. NÃO executar automaticamente — aplicar manualmente no Supabase.
-- Não altera migrations 20260813 / 20260814.

/* ─── 1. Ledger de lotes ─────────────────────────────────────── */

create table if not exists public.estoque_lotes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  empresa_id uuid,
  filial_id uuid,
  produto_id uuid not null references public.produtos (id) on delete restrict,
  numero_lote text not null,
  fornecedor_id uuid,
  nfe_entrada_id uuid,
  recebimento_item_id uuid,
  fabricacao date,
  validade date,
  quantidade_inicial numeric(14, 4) not null default 0,
  quantidade_atual numeric(14, 4) not null default 0,
  deposito_id uuid references public.estoque_depositos (id) on delete set null,
  localizacao_id uuid references public.estoque_localizacoes (id) on delete set null,
  status text not null default 'disponivel',
  bloqueado boolean not null default false,
  motivo_bloqueio text,
  observacao text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint estoque_lotes_status_check check (
    status in ('disponivel','bloqueado','esgotado','vencido','baixado')
  ),
  constraint estoque_lotes_qty_check check (quantidade_atual >= 0),
  unique (tenant_id, produto_id, numero_lote)
);

create index if not exists idx_estoque_lotes_tenant_produto
  on public.estoque_lotes (tenant_id, produto_id, validade)
  where deleted_at is null;

create index if not exists idx_estoque_lotes_validade
  on public.estoque_lotes (tenant_id, validade)
  where deleted_at is null and quantidade_atual > 0;

/* ─── 2. Movimentos de lote (ledger) ─────────────────────────── */

create table if not exists public.estoque_lote_movimentos (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  lote_id uuid not null references public.estoque_lotes (id) on delete restrict,
  produto_id uuid not null references public.produtos (id) on delete restrict,
  tipo text not null,
  quantidade numeric(14, 4) not null,
  quantidade_anterior numeric(14, 4) not null,
  quantidade_nova numeric(14, 4) not null,
  movimento_estoque_id uuid,
  origem text,
  referencia_id uuid,
  idempotency_key text,
  correlation_id text,
  observacao text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint estoque_lote_mov_tipo_check check (
    tipo in (
      'entrada','saida','transferencia','devolucao','perda','ajuste',
      'inventario','reserva','consumo'
    )
  ),
  unique (tenant_id, idempotency_key)
);

create index if not exists idx_estoque_lote_mov_lote
  on public.estoque_lote_movimentos (tenant_id, lote_id, created_at desc);

/* ─── 3. Ledger de séries ────────────────────────────────────── */

create table if not exists public.estoque_series (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  empresa_id uuid,
  filial_id uuid,
  produto_id uuid not null references public.produtos (id) on delete restrict,
  numero_serie text not null,
  status text not null default 'disponivel',
  fornecedor_id uuid,
  nfe_entrada_id uuid,
  recebimento_item_id uuid,
  deposito_id uuid references public.estoque_depositos (id) on delete set null,
  localizacao_id uuid references public.estoque_localizacoes (id) on delete set null,
  cliente_id uuid,
  venda_id uuid,
  ordem_servico_id uuid,
  garantia_ate date,
  data_entrada timestamptz,
  data_saida timestamptz,
  observacao text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint estoque_series_status_check check (
    status in (
      'disponivel','reservado','em_uso','vendido','devolvido',
      'avariado','bloqueado','baixado'
    )
  ),
  unique (tenant_id, produto_id, numero_serie)
);

create index if not exists idx_estoque_series_tenant_status
  on public.estoque_series (tenant_id, status)
  where deleted_at is null;

create table if not exists public.estoque_serie_eventos (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  serie_id uuid not null references public.estoque_series (id) on delete cascade,
  from_status text,
  to_status text not null,
  motivo text,
  referencia_tipo text,
  referencia_id uuid,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_estoque_serie_eventos
  on public.estoque_serie_eventos (tenant_id, serie_id, created_at desc);

/* ─── 4. Extensões inventário / movimentos / NF ──────────────── */

alter table public.estoque_inventarios
  add column if not exists contagem_cega boolean not null default false;

alter table public.estoque_inventarios
  add column if not exists categoria_filtro text;

alter table public.estoque_inventario_itens
  add column if not exists lote_id uuid references public.estoque_lotes (id) on delete set null;

alter table public.estoque_inventario_itens
  add column if not exists serie_id uuid references public.estoque_series (id) on delete set null;

alter table public.estoque_inventario_itens
  add column if not exists custo_divergencia numeric(14, 4);

alter table public.estoque_inventario_itens
  add column if not exists justificativa text;

alter table public.estoque_inventario_itens
  add column if not exists contado_por uuid references public.profiles (id) on delete set null;

alter table public.estoque_inventario_itens
  add column if not exists contado_em timestamptz;

alter table public.estoque_movimentacoes
  add column if not exists lote_id uuid;

alter table public.estoque_movimentacoes
  add column if not exists serie_id uuid;

alter table public.estoque_movimentacoes
  add column if not exists validade date;

-- NF-e itens: validade / fabricação (quando presentes no XML)
do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'nfe_itens'
  ) then
    alter table public.nfe_itens add column if not exists validade date;
    alter table public.nfe_itens add column if not exists fabricacao date;
    alter table public.nfe_itens add column if not exists numero_serie text;
  end if;
end $$;

-- Estado de classificação financeira pendente no recebimento
do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'compras_recebimentos'
  ) then
    alter table public.compras_recebimentos
      add column if not exists classificacao_financeira_status text
        default 'ok';
  end if;
end $$;

/* ─── 5. RLS ─────────────────────────────────────────────────── */

alter table public.estoque_lotes enable row level security;
alter table public.estoque_lote_movimentos enable row level security;
alter table public.estoque_series enable row level security;
alter table public.estoque_serie_eventos enable row level security;

drop policy if exists "Membros gerenciam estoque_lotes" on public.estoque_lotes;
create policy "Membros gerenciam estoque_lotes"
  on public.estoque_lotes for all
  using (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = estoque_lotes.tenant_id and tm.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = estoque_lotes.tenant_id and tm.user_id = auth.uid()
    )
  );

drop policy if exists "Membros gerenciam estoque_lote_movimentos" on public.estoque_lote_movimentos;
create policy "Membros gerenciam estoque_lote_movimentos"
  on public.estoque_lote_movimentos for all
  using (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = estoque_lote_movimentos.tenant_id and tm.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = estoque_lote_movimentos.tenant_id and tm.user_id = auth.uid()
    )
  );

drop policy if exists "Membros gerenciam estoque_series" on public.estoque_series;
create policy "Membros gerenciam estoque_series"
  on public.estoque_series for all
  using (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = estoque_series.tenant_id and tm.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = estoque_series.tenant_id and tm.user_id = auth.uid()
    )
  );

drop policy if exists "Membros gerenciam estoque_serie_eventos" on public.estoque_serie_eventos;
create policy "Membros gerenciam estoque_serie_eventos"
  on public.estoque_serie_eventos for all
  using (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = estoque_serie_eventos.tenant_id and tm.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = estoque_serie_eventos.tenant_id and tm.user_id = auth.uid()
    )
  );

comment on table public.estoque_lotes is 'Sprint 25.4.3 — ledger de lote com validade/FEFO';
comment on table public.estoque_series is 'Sprint 25.4.3 — rastreabilidade de número de série';
comment on table public.estoque_lote_movimentos is 'Sprint 25.4.3 — movimentos auditáveis de lote (idempotentes)';
