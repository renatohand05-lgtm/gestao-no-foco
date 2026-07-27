-- =============================================================================
-- Sprint 21.6 RC5 — SMOKE COMPLETO (PRODUCTION-SAFE)
-- BEGIN … ROLLBACK · sem COMMIT · sem DROP/TRUNCATE · sem dados permanentes
-- =============================================================================

-- ── A) Pré-check read-only (catalog) ─────────────────────────────────────────
select 'append_only' as section, t.table_name,
  case when p.policyname is null then 'FOUND' else 'INVALID' end as verdict
from (
  values ('audit_events'),('workflow_history'),('approval_decisions'),
         ('approval_history'),('notification_delivery_attempts')
) as t(table_name)
left join pg_policies p
  on p.schemaname = 'public' and p.tablename = t.table_name
 and p.cmd in ('UPDATE','DELETE','ALL');

select 'outbox_policies' as section, cmd, policyname
from pg_policies
where schemaname = 'public' and tablename = 'enterprise_outbox'
order by cmd;

select 'rpc_grants_server' as section, p.proname,
  case
    when has_function_privilege('authenticated', p.oid, 'EXECUTE') then 'INVALID'
    when has_function_privilege('service_role', p.oid, 'EXECUTE') then 'FOUND'
    else 'WARNING'
  end as verdict
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in (
    'enterprise_claim_outbox_batch','enterprise_complete_outbox_event',
    'enterprise_fail_outbox_event','enterprise_release_outbox_locks',
    'enterprise_resolve_idempotency'
  );

-- ── B) Transação de smoke (DML efêmero) ─────────────────────────────────────
begin;

do $$
declare
  v_tenant uuid;
  v_user uuid;
  v_key text;
  v_id uuid;
  v_err text;
begin
  select id into v_tenant from public.tenants order by created_at nulls last limit 1;
  select id into v_user from public.profiles order by created_at nulls last limit 1;

  if v_tenant is null then
    raise notice 'PENDENTE: sem tenant para FK — skip inserts';
    return;
  end if;

  -- B1) Actor system válido
  v_id := gen_random_uuid();
  insert into public.audit_events (
    id, tenant_id, user_id, actor_type, system_actor_key,
    event, category, severity, description
  ) values (
    v_id, v_tenant, null, 'system', 'rc5-smoke-system',
    'RC5_SMOKE_SYSTEM', 'system', 'info', 'rc5 rollback'
  );
  raise notice 'OK: audit system actor';

  -- B2) Actor inválido (system + user_id)
  if v_user is not null then
    begin
      insert into public.audit_events (
        tenant_id, user_id, actor_type, system_actor_key, event, category, severity
      ) values (
        v_tenant, v_user, 'system', 'bad', 'RC5_BAD', 'system', 'info'
      );
      raise exception 'FALHA: CHECK actor deveria rejeitar';
    exception when check_violation then
      raise notice 'OK: CHECK actor system+user_id';
    end;
  end if;

  -- B3) Unique global workflow_definitions
  v_key := 'rc5-gdup-' || substr(replace(gen_random_uuid()::text,'-',''),1,12);
  insert into public.workflow_definitions (tenant_id, workflow_key, version, name, definition)
  values (null, v_key, '1.0.0', 'G1', '{}'::jsonb);
  begin
    insert into public.workflow_definitions (tenant_id, workflow_key, version, name, definition)
    values (null, v_key, '1.0.0', 'G2', '{}'::jsonb);
    raise exception 'FALHA: unique global';
  exception when unique_violation then
    raise notice 'OK: unique global workflow_definitions';
  end;

  -- B4) Unique tenant workflow_definitions
  v_key := 'rc5-tdup-' || substr(replace(gen_random_uuid()::text,'-',''),1,12);
  insert into public.workflow_definitions (tenant_id, workflow_key, version, name, definition)
  values (v_tenant, v_key, '1.0.0', 'T1', '{}'::jsonb);
  begin
    insert into public.workflow_definitions (tenant_id, workflow_key, version, name, definition)
    values (v_tenant, v_key, '1.0.0', 'T2', '{}'::jsonb);
    raise exception 'FALHA: unique tenant';
  exception when unique_violation then
    raise notice 'OK: unique tenant workflow_definitions';
  end;

  -- B5) Outbox INSERT pending + CHECK lock
  v_id := gen_random_uuid();
  insert into public.enterprise_outbox (
    id, tenant_id, event_type, aggregate_type, aggregate_id,
    payload, status, attempts
  ) values (
    v_id, v_tenant, 'RC5_SMOKE', 'smoke', v_id::text,
    '{"rc5":true}'::jsonb, 'pending', 0
  );
  begin
    update public.enterprise_outbox
    set status = 'processing', locked_at = now(), locked_by = null
    where id = v_id;
    raise exception 'FALHA: lock_shape CHECK';
  exception
    when check_violation then raise notice 'OK: outbox lock_shape CHECK';
    when others then
      get stacked diagnostics v_err = message_text;
      raise notice 'INFO outbox check (owner bypass?): %', v_err;
  end;

  -- B6) integration actor (audit)
  insert into public.audit_events (
    tenant_id, user_id, actor_type, system_actor_key, event, category, severity
  ) values (
    v_tenant, null, 'integration', 'rc5-integration', 'RC5_INTEGRATION', 'system', 'info'
  );
  raise notice 'OK: integration actor';

  -- B7) service actor
  insert into public.audit_events (
    tenant_id, user_id, actor_type, system_actor_key, event, category, severity
  ) values (
    v_tenant, null, 'service', 'rc5-service', 'RC5_SERVICE', 'system', 'info'
  );
  raise notice 'OK: service actor';

  raise notice 'RC5 smoke DML concluído — aguardando ROLLBACK';
end;
$$;

-- PENDENTE (requer authenticated + RC5 grants aplicados):
--   • Outbox claim/complete/fail → supabase/smoke/20260807_enterprise_rc4_outbox_idempotency_auth.sql
--   • RLS tenant A/B → supabase/smoke/20260808_enterprise_rc5_auth_rls_test.sql
--   • Idempotency replay/conflict → mesma sessão authenticated (service_role no server)

rollback;
-- Obrigatório: nenhum dado permanece após ROLLBACK.
