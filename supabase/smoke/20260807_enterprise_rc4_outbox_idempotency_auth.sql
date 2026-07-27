-- =============================================================================
-- Sprint 21.6 RC4 — Smoke OUTBOX + IDEMPOTENCY (AUTHENTICATED ONLY)
-- NÃO executar como postgres em PRODUCTION como prova de segurança.
-- Requer: JWT member + tenant_id do próprio membership.
-- OBRIGATÓRIO: BEGIN … ROLLBACK (sem COMMIT).
-- =============================================================================

-- Substituir antes de executar:
--   :tenant_id  → UUID do tenant do usuário autenticado
-- Executar com role authenticated (ver ENTERPRISE_21_6_RC4_AUTH_RLS_TEST.md)

begin;

-- 1) Enqueue
-- insert into public.enterprise_outbox (
--   tenant_id, event_type, aggregate_type, aggregate_id, payload, status, attempts
-- ) values (
--   :'tenant_id', 'RC4_OUTBOX', 'smoke', gen_random_uuid()::text,
--   '{"rc4":true}'::jsonb, 'pending', 0
-- )
-- returning id;

-- 2) Claim
-- select id, status, locked_by, locked_at, attempts
-- from public.enterprise_claim_outbox_batch(:'tenant_id', 'rc4-proc-a', 10, 60);

-- 3) Segundo claim (mesma sessão / paralelo) — não deve devolver o mesmo id
-- select id from public.enterprise_claim_outbox_batch(:'tenant_id', 'rc4-proc-b', 10, 60);

-- 4) Complete com processor errado → exception
-- select public.enterprise_complete_outbox_event(:'tenant_id', '<event_id>', 'rc4-proc-b');

-- 5) Complete com processor correto
-- select public.enterprise_complete_outbox_event(:'tenant_id', '<event_id>', 'rc4-proc-a');

-- 6) Idempotency same hash
-- select public.enterprise_resolve_idempotency(
--   :'tenant_id', 'rc4-idem-' || gen_random_uuid()::text, 'rc4.op', 'hash-1', null, 60
-- );
-- select public.enterprise_resolve_idempotency(
--   :'tenant_id', '<same-key>', 'rc4.op', 'hash-1', '{"ok":true}'::jsonb, 60
-- );
-- select public.enterprise_resolve_idempotency(
--   :'tenant_id', '<same-key>', 'rc4.op', 'hash-1', null, 60
-- );
-- Esperado: replay

-- 7) Hash diferente → conflict
-- select public.enterprise_resolve_idempotency(
--   :'tenant_id', '<same-key>', 'rc4.op', 'hash-2', null, 60
-- );

rollback;
-- Concorrência real (duas sessões) = PENDENTE em staging dedicado.
