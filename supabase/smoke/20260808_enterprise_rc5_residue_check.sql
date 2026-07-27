-- =============================================================================
-- Sprint 21.6 RC5 — TESTE DE RESÍDUOS (read-only)
-- Executar APÓS smoke/RLS com ROLLBACK confirmado.
-- Se qualquer contagem > 0 → PARAR e reportar IDs (não apagar automaticamente).
-- =============================================================================

-- Marcadores RC4/RC5 usados nos smokes
with markers as (
  select unnest(array[
    'RC4_SMOKE_SYSTEM','RC4_SMOKE_BAD_ACTOR','RC5_SMOKE_SYSTEM','RC5_BAD',
    'RC5_INTEGRATION','RC5_SERVICE','RC4_SMOKE','RC5_SMOKE'
  ]) as marker
)
select 'audit_events' as source,
       ae.id::text as id,
       ae.event::text as marker,
       ae.tenant_id::text as tenant_id,
       ae.created_at as created_at
from public.audit_events ae
join markers m on ae.event = m.marker or ae.system_actor_key like 'rc%-smoke%'
   or ae.system_actor_key in ('rc4-smoke-system','rc5-smoke-system','rc5-integration','rc5-service','bad-key','bad')
union all
select 'workflow_definitions',
       wd.id::text,
       wd.workflow_key::text,
       coalesce(wd.tenant_id::text, 'GLOBAL'),
       wd.created_at
from public.workflow_definitions wd
where wd.workflow_key like 'rc4-smoke-gdup-%'
   or wd.workflow_key like 'rc5-gdup-%'
   or wd.workflow_key like 'rc5-tdup-%'
   or wd.name in ('G1','G2','T1','T2')
union all
select 'enterprise_outbox',
       eo.id::text,
       eo.event_type::text,
       eo.tenant_id::text,
       eo.created_at
from public.enterprise_outbox eo
where eo.event_type in ('RC4_SMOKE','RC5_SMOKE')
   or eo.aggregate_type = 'smoke'
union all
select 'enterprise_idempotency_keys',
       ik.id::text,
       ik.idempotency_key::text,
       ik.tenant_id::text,
       ik.created_at
from public.enterprise_idempotency_keys ik
where ik.idempotency_key like 'rc4-%'
   or ik.idempotency_key like 'rc5-%'
   or ik.operation like 'rc%.%'
order by source, created_at desc;

-- Sumário (esperado: zero linhas em todas as contagens)
select 'residue_summary' as check_name,
  (select count(*) from public.audit_events where event like 'RC%_SMOKE%' or system_actor_key like 'rc%-%') as audit_events,
  (select count(*) from public.workflow_definitions where workflow_key like 'rc%-%') as workflow_defs,
  (select count(*) from public.enterprise_outbox where event_type like 'RC%_SMOKE%') as outbox,
  (select count(*) from public.enterprise_idempotency_keys where idempotency_key like 'rc%-%') as idempotency,
  (select count(*) from public.approval_requests where correlation_id like 'rc%-%') as approvals,
  (select count(*) from public.notifications where correlation_id like 'rc%-%') as notifications;

-- Tenants/usuários de teste (não devem existir — smokes não criam auth.users)
select 'test_users' as check_name, count(*) as cnt
from public.profiles
where email like '%rc4-smoke%' or email like '%rc5-smoke%';

select 'test_tenants' as check_name, count(*) as cnt
from public.tenants
where name like '%RC4%' or name like '%RC5%' or slug like 'rc%-smoke%';

-- Veredicto esperado: todas as contagens = 0, primeira query sem linhas.
