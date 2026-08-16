# Sprint 35.2.3 — NOTIFICATIONS PRODUCTION READINESS

STATUS:

P0: nenhum no escopo desta sprint (isolamento, pipeline, test mode e DRY_RUN preservados)
P1: WhatsApp/e-mail reais e cron de production permanecem desligados de propósito
P2: homologação end-to-end com destinatário autorizado não executada (preparada)

COMMUNICATION CENTER: PASS (CRM → Comunicações, KPIs e filtros por tenant)
CUSTOMER TIMELINE: PASS (aba Comunicações no cliente)
WHATSAPP PIPELINE: PASS (status normalizados; delivered/read só via webhook)
EMAIL PIPELINE: PASS (mesmo pipeline; kill switch OFF)
SERVICE READY: PASS (35.2.2 preservado; sem canal não bloqueia)
APPOINTMENT CONFIRMATION: PASS (Confirmação preparada / Cliente sem canal disponível)
RETURN REMINDER: PASS (outbox 35.2 + origin return + CTA metadata)
RETRY: PASS (transiente na mesma linha; permanente sem retry)
IDEMPOTENCY: PASS (mesma chave; reenvio não insere linha)
OPT-OUT: PASS (decideDispatch cancelled; persist suppressed)
TEST MODE: PASS (`COMMUNICATION_MODE=disabled|test|live`; default test)
ALLOWLIST: PASS (`COMMUNICATION_TEST_ALLOWLIST`; valores fora do git)
WEBHOOK SECURITY: PASS (assinatura, dedupe antes do status, monotônico)
TENANT ISOLATION: PASS (eq tenant_id; filtro cross-tenant; resend recusa)
RBAC: PASS (`crm.notificacoes.enviar` para reenviar/detalhes)
MOBILE: PASS (`min-h-11` na central, timeline e preview)

WHATSAPP REAL: MANUAL PENDING
EMAIL REAL: MANUAL PENDING
CRON PRODUCTION: DISABLED
BILLING: UNTOUCHED

TESTES 35.2.3: PASS (14/14)
REGRESSÃO: PASS (35.2.2, 35.2.1, 35.2, 35.1)
RBAC: PASS (92/92)
LINT: PASS (0 errors; warnings preexistentes)
TYPECHECK: PASS
BUILD: PASS (inclui `/[tenant]/crm/comunicacoes`)

MIGRATION: `supabase/migrations/20260904_phase35_2_3_notification_readiness.sql` (aditiva; não executada em production)
COMMIT: ver git log desta entrega
HEAD == ORIGIN/MAIN: após push

HOMOLOGAÇÃO MANUAL: PREPARADA, NÃO EXECUTADA (roteiro A–N no runbook)

## Arquivos principais

- `app/(app)/[tenant]/crm/comunicacoes/page.tsx`
- `components/retention/communication-center.tsx`
- `components/retention/communication-timeline.tsx`
- `components/retention/notify-preview-dialog.tsx`
- `lib/retention/pipeline.ts`, `test-mode.ts`, `failures.ts`, `webhook.ts`, `notify.ts`
- `docs/product/NOTIFICATIONS.md`, `docs/operations/NOTIFICATION_RUNBOOK.md`
- `scripts/phase35-2-3-notification-readiness-tests.mjs`

## Evidências

- Testes 35.2.3, 35.2.2, 35.2.1 (2 suítes), 35.2, 35.1 e RBAC verdes nesta sessão.
- `npx tsc --noEmit` e `npm run build` verdes.
- Nenhum `COMMUNICATION_MODE=live`, `WHATSAPP_ENABLED` ou cron de production ativados.
