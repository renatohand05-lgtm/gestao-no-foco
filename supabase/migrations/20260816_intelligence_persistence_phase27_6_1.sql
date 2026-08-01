-- Migration: Sprint 27.6.1 — Inteligência Enterprise Persistence
-- Idempotent. NÃO executar automaticamente — aplicar manualmente no Supabase.
-- Não altera cálculos financeiros, DRE, RBAC canônico, nem identidade visual.
-- Isolamento por tenant + RLS.

-- 1) Sessions
create table if not exists public.intelligence_sessions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  company_id uuid null,
  branch_id uuid null,
  user_id uuid not null references public.profiles (id) on delete cascade,
  mode text not null,
  provider text null,
  model text null,
  title text null,
  status text not null default 'active',
  context jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz null,
  deleted_at timestamptz null,
  constraint intelligence_sessions_mode_check check (
    mode in ('deterministic', 'provider_assisted', 'unavailable')
  ),
  constraint intelligence_sessions_status_check check (
    status in ('active', 'archived', 'closed', 'error')
  )
);

create index if not exists idx_intel_sessions_tenant_user_created
  on public.intelligence_sessions (tenant_id, user_id, created_at desc);
create index if not exists idx_intel_sessions_tenant_status
  on public.intelligence_sessions (tenant_id, status)
  where deleted_at is null;

-- 2) Messages
create table if not exists public.intelligence_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.intelligence_sessions (id) on delete cascade,
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null,
  intent text null,
  content text not null,
  structured_output jsonb null,
  mode text not null,
  provider text null,
  model text null,
  confidence_level text null,
  confidence_score numeric null,
  correlation_id text null,
  latency_ms integer null,
  token_usage jsonb null,
  estimated_cost numeric null,
  created_at timestamptz not null default now(),
  deleted_at timestamptz null,
  constraint intelligence_messages_role_check check (
    role in ('user', 'assistant', 'system')
  ),
  constraint intelligence_messages_mode_check check (
    mode in ('deterministic', 'provider_assisted', 'unavailable')
  )
);

create index if not exists idx_intel_messages_tenant_session_created
  on public.intelligence_messages (tenant_id, session_id, created_at);
create index if not exists idx_intel_messages_correlation
  on public.intelligence_messages (tenant_id, correlation_id)
  where correlation_id is not null;
create index if not exists idx_intel_messages_intent
  on public.intelligence_messages (tenant_id, intent)
  where intent is not null;

-- 3) Evidence
create table if not exists public.intelligence_evidence (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.intelligence_messages (id) on delete cascade,
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  company_id uuid null,
  branch_id uuid null,
  source text not null,
  source_type text not null,
  module text not null,
  entity text null,
  entity_id text null,
  metric text null,
  period_start date null,
  period_end date null,
  value jsonb null,
  unit text null,
  reliability text null,
  freshness text null,
  calculated_at timestamptz null,
  deep_link text null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_intel_evidence_tenant_message
  on public.intelligence_evidence (tenant_id, message_id);
create index if not exists idx_intel_evidence_module
  on public.intelligence_evidence (tenant_id, module);

-- 4) Audit events
create table if not exists public.intelligence_audit_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  company_id uuid null,
  branch_id uuid null,
  user_id uuid null references public.profiles (id) on delete set null,
  session_id uuid null references public.intelligence_sessions (id) on delete set null,
  message_id uuid null references public.intelligence_messages (id) on delete set null,
  correlation_id text null,
  event_type text not null,
  module text null,
  intent text null,
  mode text null,
  provider text null,
  model text null,
  status text not null,
  latency_ms integer null,
  token_usage jsonb null,
  estimated_cost numeric null,
  confidence jsonb null,
  limitations jsonb null,
  error_code text null,
  error_message text null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_intel_audit_tenant_correlation
  on public.intelligence_audit_events (tenant_id, correlation_id);
create index if not exists idx_intel_audit_tenant_created
  on public.intelligence_audit_events (tenant_id, created_at desc);
create index if not exists idx_intel_audit_module
  on public.intelligence_audit_events (tenant_id, module);
create index if not exists idx_intel_audit_intent
  on public.intelligence_audit_events (tenant_id, intent);

-- 5) Feedback
create table if not exists public.intelligence_feedback (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  message_id uuid not null references public.intelligence_messages (id) on delete cascade,
  feedback_type text not null,
  comment text null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint intelligence_feedback_type_check check (
    feedback_type in (
      'util',
      'nao_util',
      'incorreto',
      'incompleto',
      'dado_desatualizado',
      'acao_irrelevante'
    )
  )
);

create index if not exists idx_intel_feedback_tenant_message
  on public.intelligence_feedback (tenant_id, message_id);

-- 6) Action plans
create table if not exists public.intelligence_action_plans (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  company_id uuid null,
  branch_id uuid null,
  session_id uuid null references public.intelligence_sessions (id) on delete set null,
  message_id uuid null references public.intelligence_messages (id) on delete set null,
  objective text not null,
  steps jsonb not null default '[]'::jsonb,
  owner_id uuid null references public.profiles (id) on delete set null,
  responsible_role text null,
  deadline date null,
  priority text not null default 'media',
  status text not null default 'draft',
  expected_impact jsonb null,
  confidence jsonb null,
  created_by uuid not null references public.profiles (id) on delete restrict,
  approved_by uuid null references public.profiles (id) on delete set null,
  approved_at timestamptz null,
  executed_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint intelligence_action_plans_priority_check check (
    priority in ('baixa', 'media', 'alta', 'critica')
  ),
  constraint intelligence_action_plans_status_check check (
    status in ('draft', 'pending_approval', 'approved', 'rejected', 'executed', 'cancelled')
  )
);

create index if not exists idx_intel_action_plans_tenant_status
  on public.intelligence_action_plans (tenant_id, status);

-- 7) Automation drafts
create table if not exists public.intelligence_automation_drafts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  company_id uuid null,
  branch_id uuid null,
  session_id uuid null references public.intelligence_sessions (id) on delete set null,
  message_id uuid null references public.intelligence_messages (id) on delete set null,
  automation_type text not null,
  title text not null,
  description text null,
  trigger_definition jsonb not null default '{}'::jsonb,
  action_definition jsonb not null default '{}'::jsonb,
  status text not null default 'draft',
  created_by uuid not null references public.profiles (id) on delete restrict,
  approved_by uuid null references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint intelligence_automation_drafts_status_check check (
    status in ('draft', 'pending_approval', 'approved', 'rejected', 'disabled')
  )
);

create index if not exists idx_intel_automation_drafts_tenant_status
  on public.intelligence_automation_drafts (tenant_id, status);

-- RLS
alter table public.intelligence_sessions enable row level security;
alter table public.intelligence_messages enable row level security;
alter table public.intelligence_evidence enable row level security;
alter table public.intelligence_audit_events enable row level security;
alter table public.intelligence_feedback enable row level security;
alter table public.intelligence_action_plans enable row level security;
alter table public.intelligence_automation_drafts enable row level security;

-- Helper: membership of tenant
-- SELECT sessions: own tenant, not deleted
drop policy if exists intel_sessions_select on public.intelligence_sessions;
create policy intel_sessions_select
  on public.intelligence_sessions for select
  using (
    deleted_at is null
    and tenant_id in (
      select tm.tenant_id from public.tenant_members tm where tm.user_id = auth.uid()
    )
  );

drop policy if exists intel_sessions_insert on public.intelligence_sessions;
create policy intel_sessions_insert
  on public.intelligence_sessions for insert
  with check (
    user_id = auth.uid()
    and tenant_id in (
      select tm.tenant_id from public.tenant_members tm where tm.user_id = auth.uid()
    )
  );

drop policy if exists intel_sessions_update on public.intelligence_sessions;
create policy intel_sessions_update
  on public.intelligence_sessions for update
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

drop policy if exists intel_messages_select on public.intelligence_messages;
create policy intel_messages_select
  on public.intelligence_messages for select
  using (
    deleted_at is null
    and tenant_id in (
      select tm.tenant_id from public.tenant_members tm where tm.user_id = auth.uid()
    )
  );

drop policy if exists intel_messages_insert on public.intelligence_messages;
create policy intel_messages_insert
  on public.intelligence_messages for insert
  with check (
    tenant_id in (
      select tm.tenant_id from public.tenant_members tm where tm.user_id = auth.uid()
    )
  );

drop policy if exists intel_messages_update on public.intelligence_messages;
create policy intel_messages_update
  on public.intelligence_messages for update
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

drop policy if exists intel_evidence_select on public.intelligence_evidence;
create policy intel_evidence_select
  on public.intelligence_evidence for select
  using (
    tenant_id in (
      select tm.tenant_id from public.tenant_members tm where tm.user_id = auth.uid()
    )
  );

drop policy if exists intel_evidence_insert on public.intelligence_evidence;
create policy intel_evidence_insert
  on public.intelligence_evidence for insert
  with check (
    tenant_id in (
      select tm.tenant_id from public.tenant_members tm where tm.user_id = auth.uid()
    )
  );

drop policy if exists intel_audit_select on public.intelligence_audit_events;
create policy intel_audit_select
  on public.intelligence_audit_events for select
  using (
    tenant_id in (
      select tm.tenant_id from public.tenant_members tm where tm.user_id = auth.uid()
    )
  );

drop policy if exists intel_audit_insert on public.intelligence_audit_events;
create policy intel_audit_insert
  on public.intelligence_audit_events for insert
  with check (
    tenant_id in (
      select tm.tenant_id from public.tenant_members tm where tm.user_id = auth.uid()
    )
  );

drop policy if exists intel_feedback_select on public.intelligence_feedback;
create policy intel_feedback_select
  on public.intelligence_feedback for select
  using (
    tenant_id in (
      select tm.tenant_id from public.tenant_members tm where tm.user_id = auth.uid()
    )
  );

drop policy if exists intel_feedback_insert on public.intelligence_feedback;
create policy intel_feedback_insert
  on public.intelligence_feedback for insert
  with check (
    user_id = auth.uid()
    and tenant_id in (
      select tm.tenant_id from public.tenant_members tm where tm.user_id = auth.uid()
    )
  );

drop policy if exists intel_action_plans_select on public.intelligence_action_plans;
create policy intel_action_plans_select
  on public.intelligence_action_plans for select
  using (
    tenant_id in (
      select tm.tenant_id from public.tenant_members tm where tm.user_id = auth.uid()
    )
  );

drop policy if exists intel_action_plans_insert on public.intelligence_action_plans;
create policy intel_action_plans_insert
  on public.intelligence_action_plans for insert
  with check (
    created_by = auth.uid()
    and tenant_id in (
      select tm.tenant_id from public.tenant_members tm where tm.user_id = auth.uid()
    )
  );

drop policy if exists intel_action_plans_update on public.intelligence_action_plans;
create policy intel_action_plans_update
  on public.intelligence_action_plans for update
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

drop policy if exists intel_automation_select on public.intelligence_automation_drafts;
create policy intel_automation_select
  on public.intelligence_automation_drafts for select
  using (
    tenant_id in (
      select tm.tenant_id from public.tenant_members tm where tm.user_id = auth.uid()
    )
  );

drop policy if exists intel_automation_insert on public.intelligence_automation_drafts;
create policy intel_automation_insert
  on public.intelligence_automation_drafts for insert
  with check (
    created_by = auth.uid()
    and tenant_id in (
      select tm.tenant_id from public.tenant_members tm where tm.user_id = auth.uid()
    )
  );

drop policy if exists intel_automation_update on public.intelligence_automation_drafts;
create policy intel_automation_update
  on public.intelligence_automation_drafts for update
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

comment on table public.intelligence_sessions is
  'Fase 27.6.1 — Sessões do Copiloto Executivo. Aplicar migration manualmente.';
comment on table public.intelligence_audit_events is
  'Fase 27.6.1 — Auditoria de inteligência. Sem secrets no metadata.';
