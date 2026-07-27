-- Migration: Sprint 21.6 RC5 — Endurecimento de GRANTs das RPCs Enterprise
-- NÃO expor processamento server-side via PostgREST (authenticated/anon).
-- Aplicar APÓS 20260807_enterprise_rpc.sql
--
-- Classificação:
--   SERVER-ONLY (service_role): outbox + idempotency
--   AUTHENTICATED (membro): save definitions + approval decision (INVOKER/DEFINER + assert_tenant_member)
--
-- service_role: uso exclusivo server-side (lib/supabase/admin.ts). NUNCA no browser.

-- ═══════════════════════════════════════════════════════════════
-- SERVER-ONLY — REVOKE authenticated + anon; GRANT service_role
-- ═══════════════════════════════════════════════════════════════

revoke all on function public.enterprise_claim_outbox_batch(uuid, text, integer, integer) from public;
revoke all on function public.enterprise_complete_outbox_event(uuid, uuid, text) from public;
revoke all on function public.enterprise_fail_outbox_event(uuid, uuid, text, text, boolean) from public;
revoke all on function public.enterprise_release_outbox_locks(uuid, integer) from public;
revoke all on function public.enterprise_resolve_idempotency(uuid, text, text, text, jsonb, integer) from public;

revoke execute on function public.enterprise_claim_outbox_batch(uuid, text, integer, integer) from anon, authenticated;
revoke execute on function public.enterprise_complete_outbox_event(uuid, uuid, text) from anon, authenticated;
revoke execute on function public.enterprise_fail_outbox_event(uuid, uuid, text, text, boolean) from anon, authenticated;
revoke execute on function public.enterprise_release_outbox_locks(uuid, integer) from anon, authenticated;
revoke execute on function public.enterprise_resolve_idempotency(uuid, text, text, text, jsonb, integer) from anon, authenticated;

grant execute on function public.enterprise_claim_outbox_batch(uuid, text, integer, integer) to service_role;
grant execute on function public.enterprise_complete_outbox_event(uuid, uuid, text) to service_role;
grant execute on function public.enterprise_fail_outbox_event(uuid, uuid, text, text, boolean) to service_role;
grant execute on function public.enterprise_release_outbox_locks(uuid, integer) to service_role;
grant execute on function public.enterprise_resolve_idempotency(uuid, text, text, text, jsonb, integer) to service_role;

-- ═══════════════════════════════════════════════════════════════
-- AUTHENTICATED — ações de membro (tenant validado na RPC)
-- ═══════════════════════════════════════════════════════════════

revoke all on function public.enterprise_save_workflow_definition(uuid, text, text, text, jsonb, text, text, boolean) from public;
revoke all on function public.enterprise_save_approval_definition(uuid, text, text, text, jsonb, text, text, boolean) from public;
revoke all on function public.enterprise_save_notification_template(uuid, text, text, text, text, text, text, jsonb, jsonb, jsonb, boolean) from public;
revoke all on function public.enterprise_commit_approval_decision(uuid, uuid, text, uuid, text, text, text, text, text, text, text, text) from public;

revoke execute on function public.enterprise_save_workflow_definition(uuid, text, text, text, jsonb, text, text, boolean) from anon;
revoke execute on function public.enterprise_save_approval_definition(uuid, text, text, text, jsonb, text, text, boolean) from anon;
revoke execute on function public.enterprise_save_notification_template(uuid, text, text, text, text, text, text, jsonb, jsonb, jsonb, boolean) from anon;
revoke execute on function public.enterprise_commit_approval_decision(uuid, uuid, text, uuid, text, text, text, text, text, text, text, text) from anon;

grant execute on function public.enterprise_save_workflow_definition(uuid, text, text, text, jsonb, text, text, boolean) to authenticated;
grant execute on function public.enterprise_save_approval_definition(uuid, text, text, text, jsonb, text, text, boolean) to authenticated;
grant execute on function public.enterprise_save_notification_template(uuid, text, text, text, text, text, text, jsonb, jsonb, jsonb, boolean) to authenticated;
grant execute on function public.enterprise_commit_approval_decision(uuid, uuid, text, uuid, text, text, text, text, text, text, text, text) to authenticated;

-- service_role mantém acesso total (bypass PostgREST restrictions quando necessário)
grant execute on function public.enterprise_save_workflow_definition(uuid, text, text, text, jsonb, text, text, boolean) to service_role;
grant execute on function public.enterprise_save_approval_definition(uuid, text, text, text, jsonb, text, text, boolean) to service_role;
grant execute on function public.enterprise_save_notification_template(uuid, text, text, text, text, text, text, jsonb, jsonb, jsonb, boolean) to service_role;
grant execute on function public.enterprise_commit_approval_decision(uuid, uuid, text, uuid, text, text, text, text, text, text, text, text) to service_role;

comment on function public.enterprise_claim_outbox_batch is
  'RC5 SERVER-ONLY (service_role). Claim atómico FOR UPDATE SKIP LOCKED + locked_by.';
