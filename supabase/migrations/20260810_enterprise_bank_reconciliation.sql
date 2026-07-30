-- Migration: Sprint 22.6.2 — Bank Reconciliation Persistence
-- Idempotent. NÃO executada automaticamente — aplicar manualmente no Supabase.
-- Não altera DRE, Fluxo engines, Vendas, OS, Import Engine core.
-- Isolamento por tenant + RLS.

-- 1) Sessões de conciliação
create table if not exists public.bank_reconciliation_sessions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  bank_account_id uuid not null references public.contas_bancarias (id) on delete restrict,
  status text not null default 'open',
  created_by uuid null references public.profiles (id) on delete set null,
  closed_by uuid null references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  closed_at timestamptz null,
  notes text null,
  constraint bank_reconciliation_sessions_status_check check (
    status in ('open', 'closed')
  )
);

create index if not exists idx_bank_recon_sessions_tenant_created
  on public.bank_reconciliation_sessions (tenant_id, created_at desc);
create index if not exists idx_bank_recon_sessions_tenant_account
  on public.bank_reconciliation_sessions (tenant_id, bank_account_id);

-- 2) Linhas de extrato importadas (staging de conciliação)
create table if not exists public.bank_statement_lines (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  session_id uuid null references public.bank_reconciliation_sessions (id) on delete set null,
  bank_account_id uuid not null references public.contas_bancarias (id) on delete restrict,
  movement_date date not null,
  amount numeric(14, 2) not null,
  description text not null default '',
  document_ref text null,
  counterparty text null,
  external_id text null,
  balance_after numeric(14, 2) null,
  import_run_id uuid null,
  created_at timestamptz not null default now()
);

create index if not exists idx_bank_statement_lines_tenant_account_date
  on public.bank_statement_lines (tenant_id, bank_account_id, movement_date desc);
create unique index if not exists uq_bank_statement_lines_tenant_external
  on public.bank_statement_lines (tenant_id, bank_account_id, external_id)
  where external_id is not null;

-- 3) Matches / decisões de conciliação (auditoria)
create table if not exists public.bank_reconciliation_matches (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  session_id uuid not null references public.bank_reconciliation_sessions (id) on delete cascade,
  statement_line_id uuid not null references public.bank_statement_lines (id) on delete cascade,
  internal_movement_id uuid null references public.movimentacoes_bancarias (id) on delete set null,
  status text not null,
  confidence numeric(5, 4) not null default 0,
  decision text not null default 'pending',
  justification text null,
  criteria jsonb not null default '[]'::jsonb,
  decided_by uuid null references public.profiles (id) on delete set null,
  decided_at timestamptz null,
  created_at timestamptz not null default now(),
  constraint bank_reconciliation_matches_status_check check (
    status in (
      'auto_matched',
      'suggestion',
      'awaiting_confirmation',
      'divergent',
      'unmatched',
      'ignored'
    )
  ),
  constraint bank_reconciliation_matches_decision_check check (
    decision in ('pending', 'accepted', 'rejected', 'ignored')
  )
);

create index if not exists idx_bank_recon_matches_tenant_session
  on public.bank_reconciliation_matches (tenant_id, session_id);
create index if not exists idx_bank_recon_matches_tenant_movement
  on public.bank_reconciliation_matches (tenant_id, internal_movement_id);

-- RLS
alter table public.bank_reconciliation_sessions enable row level security;
alter table public.bank_statement_lines enable row level security;
alter table public.bank_reconciliation_matches enable row level security;

drop policy if exists bank_recon_sessions_tenant_isolation on public.bank_reconciliation_sessions;
create policy bank_recon_sessions_tenant_isolation
  on public.bank_reconciliation_sessions
  for all
  using (
    tenant_id in (
      select tm.tenant_id from public.tenant_members tm where tm.user_id = auth.uid()
    )
  )
  with check (
    tenant_id in (
      select tm.tenant_id from public.tenant_members tm where tm.user_id = auth.uid()
    )
  );

drop policy if exists bank_statement_lines_tenant_isolation on public.bank_statement_lines;
create policy bank_statement_lines_tenant_isolation
  on public.bank_statement_lines
  for all
  using (
    tenant_id in (
      select tm.tenant_id from public.tenant_members tm where tm.user_id = auth.uid()
    )
  )
  with check (
    tenant_id in (
      select tm.tenant_id from public.tenant_members tm where tm.user_id = auth.uid()
    )
  );

drop policy if exists bank_recon_matches_tenant_isolation on public.bank_reconciliation_matches;
create policy bank_recon_matches_tenant_isolation
  on public.bank_reconciliation_matches
  for all
  using (
    tenant_id in (
      select tm.tenant_id from public.tenant_members tm where tm.user_id = auth.uid()
    )
  )
  with check (
    tenant_id in (
      select tm.tenant_id from public.tenant_members tm where tm.user_id = auth.uid()
    )
  );
