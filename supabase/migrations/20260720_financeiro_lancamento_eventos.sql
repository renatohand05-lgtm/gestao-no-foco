-- Sprint 13.16.1 — Histórico de eventos de Contas a Pagar / Receber
-- Execute MANUALMENTE no Supabase SQL Editor
-- Incremental; não altera migrations antigas; sem DELETE físico

create table if not exists public.financeiro_lancamento_eventos (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  entity_type text not null
    check (entity_type in ('conta_pagar', 'conta_receber')),
  entity_id uuid not null,
  action text not null
    check (
      action in (
        'criacao',
        'edicao',
        'cancelamento',
        'soft_delete',
        'restauracao',
        'pagamento',
        'recebimento',
        'estorno',
        'alteracao_valor',
        'alteracao_competencia',
        'alteracao_categoria',
        'alteracao_centro',
        'alteracao_rateio',
        'duplicacao'
      )
    ),
  motivo text,
  payload_antes jsonb,
  payload_depois jsonb,
  user_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_fin_lanc_eventos_entity
  on public.financeiro_lancamento_eventos (tenant_id, entity_type, entity_id, created_at desc);

create index if not exists idx_fin_lanc_eventos_tenant
  on public.financeiro_lancamento_eventos (tenant_id, created_at desc);

alter table public.financeiro_lancamento_eventos enable row level security;

drop policy if exists "Membros leem eventos do tenant"
  on public.financeiro_lancamento_eventos;
create policy "Membros leem eventos do tenant"
  on public.financeiro_lancamento_eventos for select
  using (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = financeiro_lancamento_eventos.tenant_id
        and tm.user_id = auth.uid()
    )
  );

drop policy if exists "Membros inserem eventos do tenant"
  on public.financeiro_lancamento_eventos;
create policy "Membros inserem eventos do tenant"
  on public.financeiro_lancamento_eventos for insert
  with check (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = financeiro_lancamento_eventos.tenant_id
        and tm.user_id = auth.uid()
    )
  );

comment on table public.financeiro_lancamento_eventos is
  'Trilha de auditoria de Contas a Pagar/Receber (Sprint 13.16.1). Sem UPDATE/DELETE de eventos.';
