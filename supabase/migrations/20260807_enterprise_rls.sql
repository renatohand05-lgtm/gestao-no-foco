-- Migration: Sprint 21.6 — RLS policies (tenant_members + auth.uid)
-- Execute manualmente no Supabase SQL Editor
-- Padrão oficial: exists (select 1 from public.tenant_members tm
--   where tm.tenant_id = <table>.tenant_id and tm.user_id = auth.uid())
-- Reutiliza assert_tenant_member apenas em RPCs (já existente).
-- Revisado: globais somente leitura · append-only · outbox sem DELETE

-- ── audit_events: append-only (SELECT + INSERT) ─────────────────
alter table public.audit_events enable row level security;

drop policy if exists "Membros leem audit_events" on public.audit_events;
create policy "Membros leem audit_events"
  on public.audit_events for select
  using (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = audit_events.tenant_id and tm.user_id = auth.uid()
    )
  );

drop policy if exists "Membros inserem audit_events" on public.audit_events;
create policy "Membros inserem audit_events"
  on public.audit_events for insert
  with check (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = audit_events.tenant_id and tm.user_id = auth.uid()
    )
  );
-- sem UPDATE/DELETE

-- ── workflow_definitions: globais = SELECT only; tenant = CRUD membro ─
alter table public.workflow_definitions enable row level security;

drop policy if exists "Membros gerenciam workflow_definitions" on public.workflow_definitions;
drop policy if exists "Membros leem workflow_definitions" on public.workflow_definitions;
drop policy if exists "Membros escrevem workflow_definitions tenant" on public.workflow_definitions;

create policy "Membros leem workflow_definitions"
  on public.workflow_definitions for select
  using (
    tenant_id is null
    or exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = workflow_definitions.tenant_id and tm.user_id = auth.uid()
    )
  );

create policy "Membros escrevem workflow_definitions tenant"
  on public.workflow_definitions for insert
  with check (
    tenant_id is not null
    and exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = workflow_definitions.tenant_id and tm.user_id = auth.uid()
    )
  );

create policy "Membros atualizam workflow_definitions tenant"
  on public.workflow_definitions for update
  using (
    tenant_id is not null
    and exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = workflow_definitions.tenant_id and tm.user_id = auth.uid()
    )
  )
  with check (
    tenant_id is not null
    and exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = workflow_definitions.tenant_id and tm.user_id = auth.uid()
    )
  );

create policy "Membros removem workflow_definitions tenant"
  on public.workflow_definitions for delete
  using (
    tenant_id is not null
    and exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = workflow_definitions.tenant_id and tm.user_id = auth.uid()
    )
  );

-- ── workflow_instances ──────────────────────────────────────────
alter table public.workflow_instances enable row level security;
drop policy if exists "Membros gerenciam workflow_instances" on public.workflow_instances;
create policy "Membros gerenciam workflow_instances"
  on public.workflow_instances for all
  using (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = workflow_instances.tenant_id and tm.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = workflow_instances.tenant_id and tm.user_id = auth.uid()
    )
  );

-- ── workflow_history: append-only ───────────────────────────────
alter table public.workflow_history enable row level security;
drop policy if exists "Membros leem workflow_history" on public.workflow_history;
create policy "Membros leem workflow_history"
  on public.workflow_history for select
  using (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = workflow_history.tenant_id and tm.user_id = auth.uid()
    )
  );
drop policy if exists "Membros inserem workflow_history" on public.workflow_history;
create policy "Membros inserem workflow_history"
  on public.workflow_history for insert
  with check (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = workflow_history.tenant_id and tm.user_id = auth.uid()
    )
  );

alter table public.workflow_pending_actions enable row level security;
drop policy if exists "Membros gerenciam workflow_pending_actions" on public.workflow_pending_actions;
create policy "Membros gerenciam workflow_pending_actions"
  on public.workflow_pending_actions for all
  using (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = workflow_pending_actions.tenant_id and tm.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = workflow_pending_actions.tenant_id and tm.user_id = auth.uid()
    )
  );

-- ── approval_definitions: globais = SELECT only ─────────────────
alter table public.approval_definitions enable row level security;
drop policy if exists "Membros gerenciam approval_definitions" on public.approval_definitions;
drop policy if exists "Membros leem approval_definitions" on public.approval_definitions;

create policy "Membros leem approval_definitions"
  on public.approval_definitions for select
  using (
    tenant_id is null
    or exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = approval_definitions.tenant_id and tm.user_id = auth.uid()
    )
  );

create policy "Membros inserem approval_definitions tenant"
  on public.approval_definitions for insert
  with check (
    tenant_id is not null
    and exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = approval_definitions.tenant_id and tm.user_id = auth.uid()
    )
  );

create policy "Membros atualizam approval_definitions tenant"
  on public.approval_definitions for update
  using (
    tenant_id is not null
    and exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = approval_definitions.tenant_id and tm.user_id = auth.uid()
    )
  )
  with check (
    tenant_id is not null
    and exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = approval_definitions.tenant_id and tm.user_id = auth.uid()
    )
  );

create policy "Membros removem approval_definitions tenant"
  on public.approval_definitions for delete
  using (
    tenant_id is not null
    and exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = approval_definitions.tenant_id and tm.user_id = auth.uid()
    )
  );

alter table public.approval_requests enable row level security;
drop policy if exists "Membros gerenciam approval_requests" on public.approval_requests;
create policy "Membros gerenciam approval_requests"
  on public.approval_requests for all
  using (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = approval_requests.tenant_id and tm.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = approval_requests.tenant_id and tm.user_id = auth.uid()
    )
  );

-- approval_decisions: imutável (select+insert)
alter table public.approval_decisions enable row level security;
drop policy if exists "Membros leem approval_decisions" on public.approval_decisions;
create policy "Membros leem approval_decisions"
  on public.approval_decisions for select
  using (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = approval_decisions.tenant_id and tm.user_id = auth.uid()
    )
  );
drop policy if exists "Membros inserem approval_decisions" on public.approval_decisions;
create policy "Membros inserem approval_decisions"
  on public.approval_decisions for insert
  with check (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = approval_decisions.tenant_id and tm.user_id = auth.uid()
    )
  );

alter table public.approval_history enable row level security;
drop policy if exists "Membros leem approval_history" on public.approval_history;
create policy "Membros leem approval_history"
  on public.approval_history for select
  using (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = approval_history.tenant_id and tm.user_id = auth.uid()
    )
  );
drop policy if exists "Membros inserem approval_history" on public.approval_history;
create policy "Membros inserem approval_history"
  on public.approval_history for insert
  with check (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = approval_history.tenant_id and tm.user_id = auth.uid()
    )
  );

alter table public.approval_pending_actions enable row level security;
drop policy if exists "Membros gerenciam approval_pending_actions" on public.approval_pending_actions;
create policy "Membros gerenciam approval_pending_actions"
  on public.approval_pending_actions for all
  using (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = approval_pending_actions.tenant_id and tm.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = approval_pending_actions.tenant_id and tm.user_id = auth.uid()
    )
  );

-- ── notifications ───────────────────────────────────────────────
alter table public.notifications enable row level security;
drop policy if exists "Membros gerenciam notifications" on public.notifications;
create policy "Membros gerenciam notifications"
  on public.notifications for all
  using (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = notifications.tenant_id and tm.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = notifications.tenant_id and tm.user_id = auth.uid()
    )
  );

alter table public.notification_recipients enable row level security;
drop policy if exists "Membros gerenciam notification_recipients" on public.notification_recipients;
create policy "Membros gerenciam notification_recipients"
  on public.notification_recipients for all
  using (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = notification_recipients.tenant_id and tm.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = notification_recipients.tenant_id and tm.user_id = auth.uid()
    )
  );

-- delivery attempts: append-only
alter table public.notification_delivery_attempts enable row level security;
drop policy if exists "Membros leem notification_delivery_attempts" on public.notification_delivery_attempts;
create policy "Membros leem notification_delivery_attempts"
  on public.notification_delivery_attempts for select
  using (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = notification_delivery_attempts.tenant_id and tm.user_id = auth.uid()
    )
  );
drop policy if exists "Membros inserem notification_delivery_attempts" on public.notification_delivery_attempts;
create policy "Membros inserem notification_delivery_attempts"
  on public.notification_delivery_attempts for insert
  with check (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = notification_delivery_attempts.tenant_id and tm.user_id = auth.uid()
    )
  );

alter table public.notification_preferences enable row level security;
drop policy if exists "Membros gerenciam notification_preferences" on public.notification_preferences;
create policy "Membros gerenciam notification_preferences"
  on public.notification_preferences for all
  using (
    user_id = auth.uid()
    and exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = notification_preferences.tenant_id and tm.user_id = auth.uid()
    )
  )
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = notification_preferences.tenant_id and tm.user_id = auth.uid()
    )
  );

-- notification_templates: globais = SELECT only
alter table public.notification_templates enable row level security;
drop policy if exists "Membros leem notification_templates" on public.notification_templates;
drop policy if exists "Membros gerenciam notification_templates tenant" on public.notification_templates;

create policy "Membros leem notification_templates"
  on public.notification_templates for select
  using (
    tenant_id is null
    or exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = notification_templates.tenant_id and tm.user_id = auth.uid()
    )
  );

create policy "Membros inserem notification_templates tenant"
  on public.notification_templates for insert
  with check (
    tenant_id is not null
    and exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = notification_templates.tenant_id and tm.user_id = auth.uid()
    )
  );

create policy "Membros atualizam notification_templates tenant"
  on public.notification_templates for update
  using (
    tenant_id is not null
    and exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = notification_templates.tenant_id and tm.user_id = auth.uid()
    )
  )
  with check (
    tenant_id is not null
    and exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = notification_templates.tenant_id and tm.user_id = auth.uid()
    )
  );

create policy "Membros removem notification_templates tenant"
  on public.notification_templates for delete
  using (
    tenant_id is not null
    and exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = notification_templates.tenant_id and tm.user_id = auth.uid()
    )
  );

-- ── RBAC Enterprise (RC3) ───────────────────────────────────────
-- NÃO alterar policies da tabela legado tenant_role_permissions (oficina).
alter table public.tenant_roles enable row level security;
drop policy if exists "Membros gerenciam tenant_roles" on public.tenant_roles;
create policy "Membros gerenciam tenant_roles"
  on public.tenant_roles for all
  using (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = tenant_roles.tenant_id and tm.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = tenant_roles.tenant_id and tm.user_id = auth.uid()
    )
  );

-- Remover policy Enterprise indevida se aplicada sobre a tabela legado
drop policy if exists "Membros gerenciam tenant_role_permissions" on public.tenant_role_permissions;

alter table public.tenant_rbac_role_permissions enable row level security;
drop policy if exists "Membros gerenciam tenant_rbac_role_permissions" on public.tenant_rbac_role_permissions;
create policy "Membros gerenciam tenant_rbac_role_permissions"
  on public.tenant_rbac_role_permissions for all
  using (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = tenant_rbac_role_permissions.tenant_id and tm.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = tenant_rbac_role_permissions.tenant_id and tm.user_id = auth.uid()
    )
  );

alter table public.tenant_user_roles enable row level security;
drop policy if exists "Membros gerenciam tenant_user_roles" on public.tenant_user_roles;
create policy "Membros gerenciam tenant_user_roles"
  on public.tenant_user_roles for all
  using (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = tenant_user_roles.tenant_id and tm.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = tenant_user_roles.tenant_id and tm.user_id = auth.uid()
    )
  );

alter table public.tenant_user_permission_overrides enable row level security;
drop policy if exists "Membros gerenciam tenant_user_permission_overrides" on public.tenant_user_permission_overrides;
create policy "Membros gerenciam tenant_user_permission_overrides"
  on public.tenant_user_permission_overrides for all
  using (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = tenant_user_permission_overrides.tenant_id and tm.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = tenant_user_permission_overrides.tenant_id and tm.user_id = auth.uid()
    )
  );

-- ── outbox RC1: SELECT + INSERT apenas; mutações só via RPC DEFINER ─
alter table public.enterprise_outbox enable row level security;
drop policy if exists "Membros gerenciam enterprise_outbox" on public.enterprise_outbox;
drop policy if exists "Membros leem enterprise_outbox" on public.enterprise_outbox;
drop policy if exists "Membros inserem enterprise_outbox" on public.enterprise_outbox;
drop policy if exists "Membros atualizam enterprise_outbox" on public.enterprise_outbox;

create policy "Membros leem enterprise_outbox"
  on public.enterprise_outbox for select
  using (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = enterprise_outbox.tenant_id and tm.user_id = auth.uid()
    )
  );

-- Enqueue controlado (Server Action com sessão); status inicial deve ser pending
create policy "Membros inserem enterprise_outbox pending"
  on public.enterprise_outbox for insert
  with check (
    status = 'pending'
    and locked_by is null
    and locked_at is null
    and attempts = 0
    and exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = enterprise_outbox.tenant_id and tm.user_id = auth.uid()
    )
  );
-- sem UPDATE / DELETE para authenticated — claim/complete/fail via RPC DEFINER

-- ── idempotency RC1: SELECT diagnóstico; escrita só via RPC DEFINER ─
alter table public.enterprise_idempotency_keys enable row level security;
drop policy if exists "Membros gerenciam enterprise_idempotency_keys" on public.enterprise_idempotency_keys;
drop policy if exists "Membros leem enterprise_idempotency_keys" on public.enterprise_idempotency_keys;
drop policy if exists "Membros inserem enterprise_idempotency_keys" on public.enterprise_idempotency_keys;
drop policy if exists "Membros atualizam enterprise_idempotency_keys" on public.enterprise_idempotency_keys;

create policy "Membros leem enterprise_idempotency_keys"
  on public.enterprise_idempotency_keys for select
  using (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = enterprise_idempotency_keys.tenant_id and tm.user_id = auth.uid()
    )
  );
-- sem INSERT/UPDATE/DELETE para authenticated
