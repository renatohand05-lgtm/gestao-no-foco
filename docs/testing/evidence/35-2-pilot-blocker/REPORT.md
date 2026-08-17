# PILOT BLOCKER CLOSEOUT — SEGMENT LEAKS + TEST ALLOWLIST DISPATCH

**Data:** 2026-08-17  
**Branch:** `main`  
**Tipo:** Hotfix de piloto. Sem Sprint 35.3, sem billing, sem `COMMUNICATION_MODE=live`, sem cron de production, sem envio em massa.

```
PILOT BLOCKER CLOSEOUT

SEGMENT LEAK CLINIC: PASS (código)
VEHICLES GATE: PASS
WORK ORDERS GATE: PASS
CLIENT 360: PASS
LAVA: PASS
OFICINA: PASS

WHATSAPP CONFIG: LOCAL MISSING — Vercel CLI ausente nesta máquina
WHATSAPP TEST MESSAGE: NOT SENT
WHATSAPP RECEIVED: NÃO
WHATSAPP DELIVERED: NÃO (não inventado)
WHATSAPP WEBHOOK: NÃO

EMAIL CONFIG: LOCAL MISSING
EMAIL TEST MESSAGE: NOT SENT
EMAIL RECEIVED: NÃO

APPOINTMENT CREATED: NOT RUN (destinatário/env homologação ausentes)
SERVICE READY: NOT RUN

ALLOWLIST: MISSING (local)
TEST MODE: PRESERVED (COMMUNICATION_MODE default test; live não ligado)
NO EXTERNAL DELIVERY: PASS (kill switch OFF local; fora da allowlist → suppressed)

P0: 0
P1: 0
P2: homologação real WhatsApp/e-mail + smoke production visual PENDING

TESTES: PASS (13/13 hotfix 360)
RBAC: PASS (92/92)
LINT: PASS (0 errors; 35 warnings pré-existentes)
TYPECHECK: PASS
BUILD: PASS

HOMOLOGAÇÃO: PENDING
```

## Causa raiz — 360 clínica com Veículos/OS

`components/clientes/cliente-workspace.tsx` **renderizava** cards e abas “Ordens de serviço” e “Veículos” de forma fixa. `showVehicle` da página só ia para o retorno rápido.

Corrigido via `lib/segments/client-360.ts` (capabilities/copy do Segment Engine). Sem `if (segment === "clinica")` na UI.

Alias `clinica` / `estetica` → `clinica_estetica`. Engine liga pelo perfil de produto mesmo se `segment_version` for null.

| Segmento | Veículos | OS / atendimentos |
|---|---|---|
| Oficina | SIM | OS SIM |
| Lava-rápido | SIM | Atendimentos SIM (copy OS NÃO) |
| Barbearia | NÃO | NÃO |
| Consultoria | NÃO | NÃO |
| Clínica / estética | NÃO | NÃO |
| Odontologia | NÃO | NÃO |
| Legado (engine off) | SIM | SIM (comportamento existente) |

Mobile 360 não devolve veículos/OS quando a capability está OFF (mesmo com dado residual).

## Causa raiz — notificação real não saía

`sendViaChannelProvider` existia, mas **não era chamado no enqueue**. Agenda gravava outbox em dry_run/ready e parava. Cron de production permanece DISABLED e continua `mode: "dry_run"`.

Agora: `COMMUNICATION_MODE=test` + allowlist + kill switch ON + provider configurado → enqueue `queued` → HTTP do provider → `sent` (delivered/read **somente** via webhook). Destinatário fora da allowlist em modo provider → `suppressed`. O ramo bloqueado **não** instancia o adapter Meta (corrige risco de enviar para fora da lista).

WhatsApp e e-mail são enfileirados quando o tenant habilita os dois canais.

## Env local auditado (sem valores)

```
WHATSAPP_ACCESS_TOKEN: MISSING
WHATSAPP_PHONE_NUMBER_ID: MISSING
WHATSAPP_BUSINESS_ACCOUNT_ID: MISSING
WHATSAPP_WEBHOOK_VERIFY_TOKEN: MISSING
WHATSAPP_APP_SECRET: MISSING
WHATSAPP_ENABLED: false
COMMUNICATION_MODE: test
COMMUNICATION_TEST_ALLOWLIST: MISSING
WHATSAPP_PROVIDER: dry_run
RESEND_API_KEY: MISSING
EMAIL_FROM: MISSING
EMAIL_ENABLED: false
EMAIL_PROVIDER: dry_run
```

**Por isso o E2E real não rodou nesta sessão.** Sem token, allowlist, kill switch e remetente, o fluxo para em: PROVIDER CONFIGURED = NÃO; REQUEST SENT = NÃO.

Vercel CLI não está instalado nesta máquina; Presence em production **não** foi lida. Não afirmar deploy só por git push.

## NÃO feito (de propósito)

- `COMMUNICATION_MODE=live`
- cron production
- billing
- Sprint 35.3
- envio em massa
- imprimir secrets
