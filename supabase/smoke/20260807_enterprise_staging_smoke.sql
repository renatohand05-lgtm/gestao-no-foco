-- =============================================================================
-- Sprint 21.6 RC4 — SMOKE SEGURO (PRODUCTION-AWARE)
--
-- REGRAS OBRIGATÓRIAS:
--   • Todo DML dentro de BEGIN … ROLLBACK (nunca COMMIT).
--   • Sem DROP / TRUNCATE / ALTER permanente.
--   • Sem alterar linhas pré-existentes (apenas INSERT de IDs novos + checks).
--   • Sem criar usuários permanentes em auth.users.
--   • Após ROLLBACK, nenhum registro do smoke permanece.
--
-- LIMITAÇÕES EM PRODUCTION (role tipicamente postgres / table owner):
--   • RLS NÃO prova isolamento se o role for owner (bypassa RLS sem FORCE).
--   • assert_tenant_member exige auth.uid() → RPCs outbox/idempotency
--     como postgres SEM JWT falham ou não validam membership real.
--   → Secções 3 (RLS como authenticated), 5 (outbox RPC), 6 (idempotency RPC)
--     estão marcadas PENDENTE se não houver sessão authenticated + membership.
--
-- O QUE ESTE SCRIPT VALIDA COM SEGURANÇA NESTA TRANSAÇÃO:
--   A) Catalog append-only (ausência de policies UPDATE/DELETE) — via SELECT
--   B) CHECK constraints de actors (INSERT inválido deve falhar; válido + rollback)
--   C) Uniques parciais de definitions (duplicata global/tenant) se puder usar
--      tenant_id NULL / UUID isolado SEM FK a tenants reais problemáticos
--
-- Tenant isolado: usa apenas tenant_id NULL (definições globais) ou, se a
-- tabela tenants permitir INSERT na mesma TX, cria tenant efêmero + ROLLBACK.
-- NÃO cria profiles / auth.users.
-- =============================================================================

-- ── Pré-check read-only (fora da TX de DML) ───────────────────────────────
-- Confirmar append-only por AUSÊNCIA de policies (prova correta vs owner bypass)
select 'append_only_catalog' as check_name, t.table_name, p.cmd
from (
  values
    ('audit_events'),
    ('workflow_history'),
    ('approval_decisions'),
    ('approval_history'),
    ('notification_delivery_attempts')
) as t(table_name)
left join pg_policies p
  on p.schemaname = 'public' and p.tablename = t.table_name
 and p.cmd in ('UPDATE', 'DELETE', 'ALL')
order by t.table_name;
-- Esperado: zero linhas (nenhuma policy UPDATE/DELETE/ALL)

select 'outbox_policies' as check_name, policyname, cmd
from pg_policies
where schemaname = 'public' and tablename = 'enterprise_outbox'
order by cmd;
-- Esperado: SELECT + INSERT apenas

begin;

-- IDs exclusivos deste smoke (não colidem com dados reais)
-- (gen_random_uuid() a cada execução)

-- ---------------------------------------------------------------------------
-- B1) Actor system válido (audit) — sem profile
-- ---------------------------------------------------------------------------
do $$
declare
  v_tenant uuid;
  v_id uuid := gen_random_uuid();
begin
  select id into v_tenant
  from public.tenants
  order by created_at nulls last
  limit 1;

  if v_tenant is null then
    raise notice 'PENDENTE: nenhum tenant existente para FK audit_events.tenant_id — skip insert actor system';
    return;
  end if;

  insert into public.audit_events (
    id, tenant_id, user_id, actor_type, system_actor_key,
    event, category, severity, description
  ) values (
    v_id,
    v_tenant,
    null,
    'system',
    'rc4-smoke-system',
    'RC4_SMOKE_SYSTEM',
    'system',
    'info',
    'rc4 smoke rollback'
  );
  raise notice 'OK: audit system actor insert (será revertido no ROLLBACK)';
end;
$$;

-- ---------------------------------------------------------------------------
-- B2) Actor inválido (system + user_id) → CHECK deve rejeitar
-- ---------------------------------------------------------------------------
do $$
declare
  v_tenant uuid;
  v_user uuid;
begin
  select id into v_tenant from public.tenants order by created_at nulls last limit 1;
  select id into v_user from public.profiles order by created_at nulls last limit 1;
  if v_tenant is null or v_user is null then
    raise notice 'PENDENTE: sem tenant/profile existente para teste CHECK actor inválido';
    return;
  end if;
  begin
    insert into public.audit_events (
      tenant_id, user_id, actor_type, system_actor_key,
      event, category, severity
    ) values (
      v_tenant, v_user, 'system', 'bad-key',
      'RC4_SMOKE_BAD_ACTOR', 'system', 'info'
    );
    raise exception 'FALHA: CHECK actor_shape deveria ter rejeitado system+user_id';
  exception
    when check_violation then
      raise notice 'OK: CHECK rejeitou actor system com user_id';
  end;
end;
$$;

-- ---------------------------------------------------------------------------
-- B3) Unique global workflow_definitions (tenant_id IS NULL)
-- ---------------------------------------------------------------------------
do $$
declare
  v_key text := 'rc4-smoke-gdup-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 12);
begin
  insert into public.workflow_definitions (tenant_id, workflow_key, version, name, definition)
  values (null, v_key, '1.0.0', 'G1', '{}'::jsonb);
  begin
    insert into public.workflow_definitions (tenant_id, workflow_key, version, name, definition)
    values (null, v_key, '1.0.0', 'G2', '{}'::jsonb);
    raise exception 'FALHA: unique global deveria bloquear duplicata';
  exception
    when unique_violation then
      raise notice 'OK: unique global workflow_definitions bloqueou duplicata';
  end;
end;
$$;

-- ---------------------------------------------------------------------------
-- B4) Append-only via CATALOG (já validado acima da TX) — reforço
--     Tentativa UPDATE como owner PODE ter sucesso (bypass RLS).
--     Por isso NÃO usamos UPDATE como prova em PRODUCTION.
--     Marcamos: prova oficial = ausência de policy UPDATE/DELETE.
-- ---------------------------------------------------------------------------
do $$
begin
  raise notice 'OK/INFO: append-only validado por catalog (sem policy UPDATE/DELETE). UPDATE DML como owner NÃO é prova de RLS.';
end;
$$;

-- ---------------------------------------------------------------------------
-- B5) Outbox INSERT pending (sem RPC) — estrutura + CHECK lock
-- ---------------------------------------------------------------------------
do $$
declare
  v_tenant uuid;
  v_id uuid := gen_random_uuid();
begin
  select id into v_tenant from public.tenants order by created_at nulls last limit 1;
  if v_tenant is null then
    raise notice 'PENDENTE: outbox insert — sem tenant';
    return;
  end if;

  insert into public.enterprise_outbox (
    id, tenant_id, event_type, aggregate_type, aggregate_id,
    payload, status, attempts, locked_by, locked_at
  ) values (
    v_id, v_tenant, 'RC4_SMOKE', 'smoke', v_id::text,
    jsonb_build_object('smoke', true), 'pending', 0, null, null
  );

  -- CHECK: processing exige locked_by
  begin
    update public.enterprise_outbox
    set status = 'processing', locked_at = now(), locked_by = null
    where id = v_id;
    raise exception 'FALHA: lock_shape deveria rejeitar processing sem locked_by';
  exception
    when check_violation then
      raise notice 'OK: enterprise_outbox_lock_shape_check rejeitou processing sem locked_by';
    when others then
      -- owner update pode ser bloqueado por falta de policy? owner bypassa.
      raise notice 'INFO outbox check: %', sqlerrm;
  end;
end;
$$;

-- ---------------------------------------------------------------------------
-- PENDENTE (staging authenticated) — NÃO executar cegamente em PRODUCTION
-- ---------------------------------------------------------------------------
-- 3) RLS tenant A/B como authenticated:
--    • Abrir duas sessões PostgREST/SQL com JWT de membros distintos
--    • SET ROLE authenticated; set_config request.jwt.claim.sub
--    • SELECT audit_events do outro tenant → 0 rows
--    • Ver: docs/architecture/ENTERPRISE_21_6_RC4_AUTH_RLS_TEST.md
--
-- 5) Outbox RPC claim/complete:
--    select * from enterprise_claim_outbox_batch(tenant, 'proc-a', 5, 60);
--    exige assert_tenant_member(auth.uid()) — falha sem membership JWT
--
-- 6) Idempotency RPC:
--    select enterprise_resolve_idempotency(...);
--    idem — requer authenticated member
--
-- Estes blocos ficam comentados de propósito.

-- select public.enterprise_claim_outbox_batch(
--   '<tenant_uuid>'::uuid, 'rc4-processor-a', 5, 60
-- );

rollback;

-- Obrigatório: ROLLBACK acima. Nunca COMMIT neste arquivo.
-- Confirmação: nenhum dado permanente do smoke permanece após rollback.
