# Sprint 21.6 RC1 — Plano de aplicação em STAGING

> **NÃO aplicar em produção.** Este documento só descreve a ordem operacional
> depois que a RC1 estiver verde em código (testes, lint, build).

## Pré-condições

- Backup/snapshot do projeto staging criado.
- Project ref confirmado (staging, não produção).
- Working tree revisado; **sem commit automático** — commit só após smoke + regen.
- Tipos temporários em `types/enterprise-database.ts` / fachada
  `types/database-enterprise.ts` ainda ativos (`ENTERPRISE_TYPES_PENDING_REGEN`).

## Ordem das migrations

Aplicar **somente** nesta ordem (arquivos em `supabase/migrations/`):

1. `20260807_enterprise_audit.sql`
2. `20260807_enterprise_workflow.sql`
3. `20260807_enterprise_approval.sql`
4. `20260807_enterprise_notifications.sql`
5. `20260807_enterprise_rbac.sql`
6. `20260807_enterprise_outbox_idempotency.sql`
7. `20260807_enterprise_rls.sql`
8. `20260807_enterprise_rpc.sql`

Verificar cada migration antes da seguinte (sem erros; objetos esperados criados).

## Passos pós-apply

1. Criar backup/snapshot do staging.
2. Confirmar ambiente e project ref.
3. Aplicar migrations na ordem oficial (acima).
4. Verificar cada migration antes da seguinte.
5. Executar `supabase/smoke/20260807_enterprise_staging_smoke.sql` (staging only).
6. Validar RLS com tenant A e B (isolamento SELECT/INSERT).
7. Testar RPCs (claim, complete/fail ownership, save definitions, idempotency, approval).
8. Regenerar `types/database.ts` pela CLI oficial do Supabase.
9. Remover/ajustar tipos temporários (`enterprise-database.ts`, flag
   `ENTERPRISE_TYPES_PENDING_REGEN`); unificar imports via
   `types/database-enterprise.ts`.
10. Executar suites: `test:enterprise-persistence`, `test:rbac`, `test:audit`,
    `test:workflow`, `test:approval`, `test:notifications`, `lint`, `build`.
11. Validar working tree (sem secrets, sem `.next` commitado).
12. Somente depois preparar commit (humano / pedido explícito).

## Critérios de interrupção

Parar imediatamente se ocorrer:

- Qualquer erro de migration
- Policy permissiva (UPDATE/DELETE em históricos; UPDATE outbox para member)
- Fuga cross-tenant
- Claim duplicado do mesmo evento
- Imutabilidade quebrada (audit / history / decisions / delivery attempts)
- Divergência crítica de types após regen
- Build ou testes falhando

## Segurança outbox (lembrete)

- Sem UPDATE/DELETE directo para `authenticated` members.
- Claim / complete / fail / release apenas via RPCs DEFINER com
  `assert_tenant_member` + `processor_id` / `locked_by`.
- Sem worker real / cron nesta etapa.

## Actors

- Catálogo: `user` | `system` | `service` | `integration`
- Sem profiles fictícios: actors não-humanos usam `system_actor_key` e
  `user_id` / `*_id` null com CHECK constraints.
