# Sprint 21.6 RC5 — Matriz SECURITY DEFINER / RPC Enterprise

> Documentação de endurecimento. Grants efetivos exigem `20260808_enterprise_rpc_grants_rc5.sql` no banco live.

## Classificação de RPCs

| RPC | Modo | Owner esperado | Grantee | Validação tenant | Validação membership | Validação permission | search_path | Risco | Decisão |
|-----|------|----------------|---------|------------------|------------------------|----------------------|-------------|-------|---------|
| `enterprise_claim_outbox_batch` | DEFINER | postgres | **service_role** only | `assert_tenant_member(p_tenant_id)` | sim (via assert) | implícita (membro) | `public, pg_temp` | Escalada se exposto a authenticated | **B — server-only** |
| `enterprise_complete_outbox_event` | DEFINER | postgres | **service_role** only | sim | sim | lock ownership (`locked_by`) | `public, pg_temp` | Mutar outbox | **B — server-only** |
| `enterprise_fail_outbox_event` | DEFINER | postgres | **service_role** only | sim | sim | lock ownership | `public, pg_temp` | Mutar outbox | **B — server-only** |
| `enterprise_release_outbox_locks` | DEFINER | postgres | **service_role** only | sim | sim | TTL stale locks | `public, pg_temp` | Liberar locks alheios | **B — server-only** |
| `enterprise_resolve_idempotency` | DEFINER | postgres | **service_role** only | sim | sim | hash/op key | `public, pg_temp` | Bypass idempotency store | **B — server-only** |
| `enterprise_save_workflow_definition` | DEFINER | postgres | authenticated, service_role | sim | sim | não (membro basta) | `public, pg_temp` | Upsert definitions | **A — membro** |
| `enterprise_save_approval_definition` | DEFINER | postgres | authenticated, service_role | sim | sim | não | `public, pg_temp` | Upsert definitions | **A — membro** |
| `enterprise_save_notification_template` | DEFINER | postgres | authenticated, service_role | sim | sim | não | `public, pg_temp` | Upsert templates | **A — membro** |
| `enterprise_commit_approval_decision` | INVOKER | postgres | authenticated, service_role | sim | sim | approver = `auth.uid()` (user) | `public, pg_temp` | Decisão indevida | **A — membro** |

## Princípios aplicados (RC5)

1. **Server-only (B):** `REVOKE EXECUTE FROM PUBLIC, anon, authenticated`; `GRANT EXECUTE TO service_role`.
2. **Membro (A):** `REVOKE FROM PUBLIC, anon`; `GRANT TO authenticated, service_role`.
3. **`service_role`:** uso exclusivo server-side (`lib/supabase/admin.ts`). **Nunca no browser.**
4. **`assert_tenant_member`:** não confia apenas em `p_tenant_id` recebido — valida `auth.uid()` × `tenant_members`.
5. **`search_path`:** fixo `public, pg_temp` em todas as RPCs Enterprise (impede hijack de schema).
6. **Objetos qualificados:** `public.enterprise_outbox`, `public.audit_events`, etc.
7. **Comentários não são proteção:** grants no catálogo são a barreira real.

## Grants — antes vs depois (RC5)

| RPC | Antes (RC1–RC4 fresh install) | Depois (RC5) |
|-----|--------------------------------|--------------|
| Outbox + idempotency | authenticated + service_role | **service_role only** |
| Save definitions + approval | authenticated + service_role | authenticated + service_role (inalterado) |
| PUBLIC / anon | REVOKE parcial | REVOKE explícito |

## Pendências de validação live

- [ ] Executar audit read-only e confirmar `RPC_GRANTS_SERVER = FOUND` para as 5 RPCs server-only.
- [ ] Executar `20260808_enterprise_rc5_auth_rls_test.sql` — claim como authenticated deve falhar.
- [ ] Outbox adapter usa admin client (service_role) — validar em integração real.

## Referências

- `supabase/migrations/20260807_enterprise_rpc.sql`
- `supabase/migrations/20260808_enterprise_rpc_grants_rc5.sql`
- `supabase/smoke/20260807_enterprise_rc4_readonly_audit.sql` (secção RPC_GRANTS)
- `lib/enterprise/adapters/outbox-supabase-adapter.ts`
