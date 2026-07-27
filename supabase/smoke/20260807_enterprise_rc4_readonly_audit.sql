-- =============================================================================
-- Sprint 21.6 RC5 — AUDIT READ-ONLY (live schema)
-- PRODUCTION-SAFE: somente SELECT em pg_catalog / information_schema.
-- Classificação: FOUND | MISSING | INVALID | DUPLICATE | WARNING
-- =============================================================================

-- ── SUMÁRIO EXECUTIVO (executar primeiro) ───────────────────────────────────

with expected_tables as (
  select unnest(array[
    'audit_events','workflow_definitions','workflow_instances','workflow_history',
    'workflow_pending_actions','approval_definitions','approval_requests',
    'approval_decisions','approval_history','approval_pending_actions',
    'notifications','notification_recipients','notification_delivery_attempts',
    'notification_preferences','notification_templates',
    'tenant_roles','tenant_rbac_role_permissions','tenant_user_roles',
    'tenant_user_permission_overrides','enterprise_outbox','enterprise_idempotency_keys'
  ]) as table_name
),
table_status as (
  select
    e.table_name,
    case when c.oid is not null then 'FOUND' else 'MISSING' end as verdict
  from expected_tables e
  left join pg_class c
    on c.relname = e.table_name
   and c.relkind = 'r'
   and c.relnamespace = 'public'::regnamespace
)
select 'TABLES' as section, table_name as object_name, verdict
from table_status
union all
select 'TABLES_SUMMARY', 'ALL_REQUIRED', case when count(*) filter (where verdict = 'MISSING') = 0 then 'FOUND' else 'INVALID' end
from table_status
union all
select 'RLS', c.relname,
  case
    when c.oid is null then 'MISSING'
    when not c.relrowsecurity then 'INVALID'
    when not c.relforcerowsecurity then 'WARNING'
    else 'FOUND'
  end
from expected_tables e
left join pg_class c on c.relname = e.table_name and c.relnamespace = 'public'::regnamespace and c.relkind = 'r'
union all
select 'APPEND_ONLY', t.table_name,
  case when p.policyname is not null then 'INVALID' else 'FOUND' end
from (
  values ('audit_events'),('workflow_history'),('approval_decisions'),
         ('approval_history'),('notification_delivery_attempts')
) as t(table_name)
left join pg_policies p
  on p.schemaname = 'public' and p.tablename = t.table_name
 and p.cmd in ('UPDATE','DELETE','ALL')
union all
select 'OUTBOX_POLICIES', 'enterprise_outbox',
  case
    when not exists (select 1 from pg_policies where tablename = 'enterprise_outbox' and cmd = 'UPDATE') then 'FOUND'
    else 'INVALID'
  end
union all
select 'RPC_OVERLOAD', p.proname, 'DUPLICATE'
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.proname like 'enterprise_%'
group by p.proname having count(*) > 1
union all
select 'RPC_GRANTS_SERVER', f.proname,
  case
    when has_function_privilege('authenticated', f.oid, 'EXECUTE') then 'INVALID'
    when has_function_privilege('service_role', f.oid, 'EXECUTE') then 'FOUND'
    else 'WARNING'
  end
from pg_proc f
join pg_namespace n on n.oid = f.pronamespace
where n.nspname = 'public'
  and f.proname in (
    'enterprise_claim_outbox_batch','enterprise_complete_outbox_event',
    'enterprise_fail_outbox_event','enterprise_release_outbox_locks',
    'enterprise_resolve_idempotency'
  )
union all
select 'RPC_GRANTS_MEMBER', f.proname,
  case
    when has_function_privilege('authenticated', f.oid, 'EXECUTE') then 'FOUND'
    when has_function_privilege('anon', f.oid, 'EXECUTE') then 'INVALID'
    else 'WARNING'
  end
from pg_proc f
join pg_namespace n on n.oid = f.pronamespace
where n.nspname = 'public'
  and f.proname in (
    'enterprise_save_workflow_definition','enterprise_save_approval_definition',
    'enterprise_save_notification_template','enterprise_commit_approval_decision'
  )
union all
select 'RPC_SEARCH_PATH', f.proname,
  case
    when coalesce(f.proconfig::text, '') like '%search_path=public%' then 'FOUND'
    else 'INVALID'
  end
from pg_proc f
join pg_namespace n on n.oid = f.pronamespace
where n.nspname = 'public' and f.proname like 'enterprise_%'
union all
select 'LEGACY_RBAC', 'tenant_role_permissions.role_id',
  case when exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'tenant_role_permissions' and column_name = 'role_id'
  ) then 'INVALID' else 'FOUND' end
order by section, object_name;

-- ── Detalhe: colunas ────────────────────────────────────────────────────────
select table_name, column_name, data_type, udt_name, is_nullable, column_default
from information_schema.columns
where table_schema = 'public'
  and table_name in (
    'audit_events','workflow_definitions','workflow_instances','workflow_history',
    'workflow_pending_actions','approval_definitions','approval_requests',
    'approval_decisions','approval_history','approval_pending_actions',
    'notifications','notification_recipients','notification_delivery_attempts',
    'notification_preferences','notification_templates',
    'tenant_roles','tenant_rbac_role_permissions','tenant_user_roles',
    'tenant_user_permission_overrides','enterprise_outbox','enterprise_idempotency_keys'
  )
order by table_name, ordinal_position;

-- ── Detalhe: constraints ────────────────────────────────────────────────────
select c.relname as table_name, con.conname, con.contype,
       pg_get_constraintdef(con.oid) as definition
from pg_constraint con
join pg_class c on c.oid = con.conrelid
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in (
    'audit_events','workflow_definitions','workflow_instances','workflow_history',
    'workflow_pending_actions','approval_definitions','approval_requests',
    'approval_decisions','approval_history','approval_pending_actions',
    'notifications','notification_recipients','notification_delivery_attempts',
    'notification_preferences','notification_templates',
    'tenant_roles','tenant_rbac_role_permissions','tenant_user_roles',
    'tenant_user_permission_overrides','enterprise_outbox','enterprise_idempotency_keys'
  )
order by c.relname, con.contype, con.conname;

-- ── Detalhe: FKs ────────────────────────────────────────────────────────────
select tc.table_name, kcu.column_name, ccu.table_name as ref_table,
       ccu.column_name as ref_column, rc.delete_rule, rc.update_rule
from information_schema.table_constraints tc
join information_schema.key_column_usage kcu using (constraint_schema, constraint_name)
join information_schema.constraint_column_usage ccu using (constraint_schema, constraint_name)
join information_schema.referential_constraints rc using (constraint_schema, constraint_name)
where tc.constraint_type = 'FOREIGN KEY' and tc.table_schema = 'public'
  and tc.table_name in (
    'audit_events','workflow_definitions','workflow_instances','workflow_history',
    'workflow_pending_actions','approval_definitions','approval_requests',
    'approval_decisions','approval_history','approval_pending_actions',
    'notifications','notification_recipients','notification_delivery_attempts',
    'notification_preferences','notification_templates',
    'tenant_roles','tenant_rbac_role_permissions','tenant_user_roles',
    'tenant_user_permission_overrides','enterprise_outbox','enterprise_idempotency_keys'
  )
order by tc.table_name;

-- ── Detalhe: índices (incl. parciais) ───────────────────────────────────────
select tablename, indexname, indexdef
from pg_indexes
where schemaname = 'public'
  and tablename in (
    'audit_events','workflow_definitions','workflow_instances','workflow_history',
    'workflow_pending_actions','approval_definitions','approval_requests',
    'approval_decisions','approval_history','approval_pending_actions',
    'notifications','notification_recipients','notification_delivery_attempts',
    'notification_preferences','notification_templates',
    'tenant_roles','tenant_rbac_role_permissions','tenant_user_roles',
    'tenant_user_permission_overrides','enterprise_outbox','enterprise_idempotency_keys'
  )
order by tablename, indexname;

-- ── Detalhe: RLS + FORCE ────────────────────────────────────────────────────
select c.relname, c.relrowsecurity as rls_on, c.relforcerowsecurity as force_rls
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r'
  and c.relname in (
    'audit_events','workflow_definitions','workflow_instances','workflow_history',
    'workflow_pending_actions','approval_definitions','approval_requests',
    'approval_decisions','approval_history','approval_pending_actions',
    'notifications','notification_recipients','notification_delivery_attempts',
    'notification_preferences','notification_templates',
    'tenant_roles','tenant_rbac_role_permissions','tenant_user_roles',
    'tenant_user_permission_overrides','enterprise_outbox','enterprise_idempotency_keys'
  )
order by c.relname;

-- ── Detalhe: policies ───────────────────────────────────────────────────────
select tablename, policyname, cmd, roles, qual, with_check
from pg_policies
where schemaname = 'public'
  and tablename in (
    'audit_events','workflow_definitions','workflow_instances','workflow_history',
    'workflow_pending_actions','approval_definitions','approval_requests',
    'approval_decisions','approval_history','approval_pending_actions',
    'notifications','notification_recipients','notification_delivery_attempts',
    'notification_preferences','notification_templates',
    'tenant_roles','tenant_rbac_role_permissions','tenant_user_roles',
    'tenant_user_permission_overrides','enterprise_outbox','enterprise_idempotency_keys',
    'tenant_role_permissions'
  )
order by tablename, cmd;

-- ── Detalhe: RPCs ───────────────────────────────────────────────────────────
select
  p.proname,
  pg_get_function_identity_arguments(p.oid) as args,
  pg_get_function_result(p.oid) as returns,
  case when p.prosecdef then 'DEFINER' else 'INVOKER' end as security,
  r.rolname as owner,
  p.proconfig
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
join pg_roles r on r.oid = p.proowner
where n.nspname = 'public' and p.proname like 'enterprise_%'
order by p.proname, args;

-- Grants por role
select p.proname, pg_get_function_identity_arguments(p.oid) as args,
       r.rolname as grantee, has_function_privilege(r.oid, p.oid, 'EXECUTE') as can_exec
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
cross join pg_roles r
where n.nspname = 'public' and p.proname like 'enterprise_%'
  and r.rolname in ('anon','authenticated','service_role','postgres')
order by p.proname, r.rolname;

-- Legado oficina intacto
select column_name, data_type
from information_schema.columns
where table_schema = 'public' and table_name = 'tenant_role_permissions'
order by ordinal_position;
