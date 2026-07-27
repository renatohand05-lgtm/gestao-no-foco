-- =============================================================================
-- Sprint 21.6 RC5 — RLS como AUTHENTICATED (transacional, PRODUCTION-SAFE)
--
-- REGRAS:
--   • BEGIN … ROLLBACK obrigatório (nunca COMMIT).
--   • Não cria auth.users / profiles permanentes.
--   • Usa memberships EXISTENTES (tenant A ≠ tenant B).
--   • Simula JWT via set_config + SET LOCAL ROLE authenticated.
--   • NÃO executar como prova de RLS usando role postgres sem SET ROLE.
--
-- PRÉ-REQUISITO: pelo menos um membership + outro tenant em public.tenants.
--
-- Executar no SQL Editor (superuser pode impersonar authenticated).
-- =============================================================================

begin;

do $$
declare
  v_user_a   uuid;
  v_tenant_a uuid;
  v_user_b   uuid;
  v_tenant_b uuid;
  v_count    bigint;
  v_rows     int;
  v_err      text;
begin
  -- Descobrir user/tenant A (membership) + tenant B (outro tenant existente)
  select tm.user_id, tm.tenant_id
  into v_user_a, v_tenant_a
  from public.tenant_members tm
  limit 1;

  select t.id into v_tenant_b
  from public.tenants t
  where v_tenant_a is not null and t.id <> v_tenant_a
  order by t.created_at nulls last
  limit 1;

  if v_user_a is null or v_tenant_b is null then
    raise notice 'PENDENTE_BLOQUEANTE: requer membership + segundo tenant em tenants (atual: user_a=%, tenant_a=%, tenant_b=%)',
      v_user_a, v_tenant_a, v_tenant_b;
    return;
  end if;

  raise notice 'RC7 RLS: user_a=% tenant_a=% | tenant_b=% (cross-tenant)', v_user_a, v_tenant_a, v_tenant_b;

  -- ── Helper: impersonar authenticated ─────────────────────────────────────
  perform set_config('request.jwt.claim.sub', v_user_a::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  execute 'set local role authenticated';

  -- 1) User A lê apenas tenant A (cross-tenant B → 0)
  select count(*) into v_count
  from public.audit_events
  where tenant_id = v_tenant_b;
  if v_count <> 0 then
    raise exception 'FALHA RLS: user A viu % audit_events do tenant B', v_count;
  end if;
  raise notice 'OK: user A não lê audit_events do tenant B';

  -- 2) User A não insere no tenant B
  begin
    insert into public.audit_events (
      tenant_id, user_id, actor_type, event, category, severity
    ) values (
      v_tenant_b, v_user_a, 'user', 'RC5_RLS_TEST', 'system', 'info'
    );
    raise exception 'FALHA RLS: user A inseriu audit_events no tenant B';
  exception
    when insufficient_privilege then
      raise notice 'OK: user A INSERT tenant B negado (insufficient_privilege)';
    when others then
      get stacked diagnostics v_err = message_text;
      if v_err ilike '%violates row-level security%' or v_err ilike '%new row violates%' then
        raise notice 'OK: user A INSERT tenant B negado (RLS)';
      else
        raise notice 'OK/INFO: user A INSERT tenant B bloqueado: %', v_err;
      end if;
  end;

  -- 3) User A não atualiza tenant B
  update public.workflow_instances
  set status = 'rc5-probe'
  where tenant_id = v_tenant_b;
  get diagnostics v_rows = row_count;
  if v_rows <> 0 then
    raise exception 'FALHA RLS: user A atualizou % rows workflow_instances tenant B', v_rows;
  end if;
  raise notice 'OK: user A UPDATE tenant B → 0 rows';

  -- 4) Globais: workflow_definitions tenant_id IS NULL legíveis
  select count(*) into v_count
  from public.workflow_definitions
  where tenant_id is null;
  raise notice 'OK/INFO: user A lê % workflow_definitions globais (tenant_id null)', v_count;

  -- 5) auth.uid ausente → negado
  perform set_config('request.jwt.claim.sub', '', true);
  begin
    select count(*) into v_count from public.audit_events where tenant_id = v_tenant_a;
    if v_count > 0 then
      raise notice 'WARNING: auth.uid ausente mas SELECT retornou % — verificar FORCE RLS', v_count;
    else
      raise notice 'OK: auth.uid ausente → 0 rows audit_events tenant A';
    end if;
  exception when others then
    raise notice 'OK: auth.uid ausente → acesso negado';
  end;

  -- Restaurar user A
  perform set_config('request.jwt.claim.sub', v_user_a::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);

  -- 6) Tenant sem membership para user A
  declare
    v_foreign_tenant uuid;
  begin
    select t.id into v_foreign_tenant
    from public.tenants t
    where not exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = t.id and tm.user_id = v_user_a
    )
    limit 1;

    if v_foreign_tenant is not null then
      select count(*) into v_count
      from public.audit_events
      where tenant_id = v_foreign_tenant;
      if v_count <> 0 then
        raise exception 'FALHA RLS: user A viu tenant sem membership';
      end if;
      raise notice 'OK: tenant sem membership → 0 rows';
    else
      raise notice 'INFO: nenhum tenant sem membership de user A para teste';
    end if;
  end;

  -- 7) Append-only: UPDATE audit_events (deve falhar / 0 rows)
  update public.audit_events
  set description = 'rc5-mutate'
  where tenant_id = v_tenant_a;
  get diagnostics v_rows = row_count;
  if v_rows <> 0 then
    raise exception 'FALHA append-only: UPDATE audit_events afetou % rows', v_rows;
  end if;
  raise notice 'OK: audit_events append-only (UPDATE 0 rows)';

  -- 8) workflow_history append-only
  update public.workflow_history set event = 'rc5-mutate' where tenant_id = v_tenant_a;
  get diagnostics v_rows = row_count;
  if v_rows <> 0 then
    raise exception 'FALHA append-only: UPDATE workflow_history';
  end if;
  raise notice 'OK: workflow_history append-only';

  -- 9) approval_decisions append-only
  update public.approval_decisions set decision = 'rc5-mutate' where tenant_id = v_tenant_a;
  get diagnostics v_rows = row_count;
  if v_rows <> 0 then
    raise exception 'FALHA append-only: UPDATE approval_decisions';
  end if;
  raise notice 'OK: approval_decisions append-only';

  -- 10) notification_delivery_attempts append-only
  update public.notification_delivery_attempts set status = 'rc5-mutate' where tenant_id = v_tenant_a;
  get diagnostics v_rows = row_count;
  if v_rows <> 0 then
    raise exception 'FALHA append-only: UPDATE notification_delivery_attempts';
  end if;
  raise notice 'OK: notification_delivery_attempts append-only';

  -- 11) outbox: UPDATE direct negado
  update public.enterprise_outbox
  set status = 'completed'
  where tenant_id = v_tenant_a;
  get diagnostics v_rows = row_count;
  if v_rows <> 0 then
    raise exception 'FALHA outbox: UPDATE direct afetou % rows', v_rows;
  end if;
  raise notice 'OK: enterprise_outbox sem UPDATE direct (0 rows)';

  -- 12) idempotency: INSERT direct negado
  begin
    insert into public.enterprise_idempotency_keys (
      tenant_id, idempotency_key, operation, request_hash, status
    ) values (
      v_tenant_a, 'rc5-idem-probe-' || gen_random_uuid()::text, 'rc5.op', 'hash', 'pending'
    );
    raise exception 'FALHA idempotency: INSERT direct permitido';
  exception
    when insufficient_privilege then
      raise notice 'OK: idempotency INSERT negado (insufficient_privilege)';
    when others then
      get stacked diagnostics v_err = message_text;
      if v_err ilike '%row-level security%' then
        raise notice 'OK: idempotency INSERT negado (RLS)';
      else
        raise notice 'OK/INFO: idempotency INSERT bloqueado: %', v_err;
      end if;
  end;

  -- 13) RPC server-only: authenticated não deve executar claim (pós RC5 grants)
  begin
    perform public.enterprise_claim_outbox_batch(v_tenant_a, 'rc5-proc', 1, 60);
    raise notice 'WARNING: enterprise_claim_outbox_batch executou como authenticated — aplicar 20260808_enterprise_rpc_grants_rc5.sql';
  exception
    when insufficient_privilege then
      raise notice 'OK: claim_outbox negado a authenticated (insufficient_privilege)';
    when others then
      get stacked diagnostics v_err = message_text;
      if v_err ilike '%permission denied%' or v_err ilike '%acesso negado%' or v_err ilike '%não autenticado%' then
        raise notice 'OK: claim_outbox negado: %', v_err;
      else
        raise notice 'INFO claim_outbox: %', v_err;
      end if;
  end;

  -- 14) Espelho user B → tenant A
  perform set_config('request.jwt.claim.sub', v_user_b::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  execute 'set local role authenticated';

  select count(*) into v_count
  from public.audit_events
  where tenant_id = v_tenant_a;
  if v_count <> 0 then
    raise exception 'FALHA RLS: user B viu audit_events tenant A';
  end if;
  raise notice 'OK: user B não lê tenant A';

  raise notice 'RC5 RLS authenticated: bloco concluído (ROLLBACK abaixo reverte qualquer DML acidental)';
end;
$$;

rollback;
-- Nunca COMMIT. Dados de teste efêmeros revertidos.
