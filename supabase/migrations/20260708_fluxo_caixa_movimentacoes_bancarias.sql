-- Migration: Fluxo de Caixa — movimentações bancárias
-- Execute manualmente no Supabase SQL Editor
-- Requer: contas_bancarias, contas_receber, contas_pagar, tenants, profiles
-- Aplicar após: 20260708_fluxo_caixa_contas_bancarias.sql

create table if not exists public.movimentacoes_bancarias (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  conta_bancaria_id uuid not null references public.contas_bancarias (id) on delete restrict,
  conta_bancaria_contrapartida_id uuid
    references public.contas_bancarias (id) on delete set null,
  grupo_transferencia_id uuid,
  tipo text not null
    check (tipo in ('entrada', 'saida', 'ajuste', 'estorno', 'transferencia')),
  transferencia_papel text
    check (transferencia_papel in ('enviada', 'recebida')),
  valor numeric(15, 2) not null check (valor >= 0),
  saldo_anterior numeric(15, 2) not null,
  saldo_novo numeric(15, 2) not null,
  data_movimentacao date not null default current_date,
  descricao text not null,
  origem text not null default 'manual'
    check (origem in (
      'manual',
      'conta_pagar_baixa',
      'conta_receber_baixa',
      'transferencia',
      'estorno',
      'ajuste'
    )),
  conta_pagar_id uuid references public.contas_pagar (id) on delete set null,
  conta_receber_id uuid references public.contas_receber (id) on delete set null,
  movimentacao_estornada_id uuid
    references public.movimentacoes_bancarias (id) on delete set null,
  estornada_por_id uuid
    references public.movimentacoes_bancarias (id) on delete set null,
  observacoes text,
  created_by uuid references public.profiles (id) on delete set null,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  constraint movimentacoes_bancarias_transferencia_papel_check check (
    (tipo = 'transferencia' and transferencia_papel is not null)
    or (tipo <> 'transferencia' and transferencia_papel is null)
  ),
  constraint movimentacoes_bancarias_estorno_ref_check check (
    (tipo = 'estorno' and movimentacao_estornada_id is not null)
    or (tipo <> 'estorno')
  )
);

create index if not exists idx_movimentacoes_bancarias_tenant_id
  on public.movimentacoes_bancarias (tenant_id);
create index if not exists idx_movimentacoes_bancarias_conta_bancaria_id
  on public.movimentacoes_bancarias (conta_bancaria_id);
create index if not exists idx_movimentacoes_bancarias_contrapartida_id
  on public.movimentacoes_bancarias (conta_bancaria_contrapartida_id);
create index if not exists idx_movimentacoes_bancarias_grupo_transferencia
  on public.movimentacoes_bancarias (grupo_transferencia_id);
create index if not exists idx_movimentacoes_bancarias_tipo
  on public.movimentacoes_bancarias (tipo);
create index if not exists idx_movimentacoes_bancarias_origem
  on public.movimentacoes_bancarias (origem);
create index if not exists idx_movimentacoes_bancarias_data_movimentacao
  on public.movimentacoes_bancarias (data_movimentacao);
create index if not exists idx_movimentacoes_bancarias_created_at
  on public.movimentacoes_bancarias (created_at desc);
create index if not exists idx_movimentacoes_bancarias_deleted_at
  on public.movimentacoes_bancarias (deleted_at);
create index if not exists idx_movimentacoes_bancarias_conta_pagar_id
  on public.movimentacoes_bancarias (conta_pagar_id);
create index if not exists idx_movimentacoes_bancarias_conta_receber_id
  on public.movimentacoes_bancarias (conta_receber_id);
create index if not exists idx_movimentacoes_bancarias_estornada_por_id
  on public.movimentacoes_bancarias (estornada_por_id);

create unique index if not exists movimentacoes_bancarias_estorno_unico
  on public.movimentacoes_bancarias (movimentacao_estornada_id)
  where deleted_at is null and movimentacao_estornada_id is not null;

alter table public.movimentacoes_bancarias enable row level security;

drop policy if exists "Membros gerenciam movimentacoes bancarias da empresa"
  on public.movimentacoes_bancarias;
create policy "Membros gerenciam movimentacoes bancarias da empresa"
  on public.movimentacoes_bancarias for all
  using (
    exists (
      select 1
      from public.tenant_members tm
      where tm.tenant_id = movimentacoes_bancarias.tenant_id
        and tm.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.tenant_members tm
      where tm.tenant_id = movimentacoes_bancarias.tenant_id
        and tm.user_id = auth.uid()
    )
  );

comment on table public.movimentacoes_bancarias is
  'Ledger de movimentações bancárias por tenant (fluxo de caixa enterprise)';
comment on column public.movimentacoes_bancarias.transferencia_papel is
  'Papel na transferência: enviada (origem) ou recebida (destino)';
comment on column public.movimentacoes_bancarias.grupo_transferencia_id is
  'Agrupa as duas pernas de uma transferência entre contas';
comment on column public.movimentacoes_bancarias.movimentacao_estornada_id is
  'Movimentação original revertida por um lançamento tipo estorno';
