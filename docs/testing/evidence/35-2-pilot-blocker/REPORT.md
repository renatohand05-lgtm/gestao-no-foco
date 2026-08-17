# HOTFIX PILOT BLOCKER — RECOVERY CLOSEOUT

**Data:** 2026-08-17  
**Branch:** `main`  
**Tipo:** Retomada. Sem Sprint 35.3, sem billing, sem `COMMUNICATION_MODE=live`, sem cron de production, sem envio em massa.

```
RECUPERAÇÃO: PUSH já concluído (7a25fbe == origin/main). Continuado só UX compacta de veículo na agenda.

ESTADO ENCONTRADO: main limpo quanto ao hotfix; dirt leftover 31-11-15/33-3/33-1 (NÃO commitado).
ALTERAÇÕES RECUPERADAS: 540f276 (360 + allowlist dispatch) + 3c7078e + 7a25fbe (report).
ALTERAÇÕES CONCLUÍDAS: picker/dialog compacto na agenda (Modelo* + Placa + Salvar e usar).

SEGMENT LEAK: PASS (código)
CLÍNICA VEHICLES: OFF / não renderiza
CLÍNICA WORK ORDERS: OFF / não renderiza
CLIENT 360: PASS
LAVA VEHICLE: PASS (agenda gated por showVehicles)
LAVA QUICK CREATE: PASS (compacto na agenda)
LAVA CHECKLIST: PASS (template sem diagnóstico mecânico)
OFICINA: PASS (OS + veículo + diagnóstico)

APPOINTMENT NOTIFICATION: PREPARED — E2E real PENDING
OUTBOX: código enqueue+dispatch no commit 540f276
WHATSAPP CONFIG: LOCAL ALL MISSING; kill switch false; provider dry_run
WHATSAPP SENT: NÃO
WHATSAPP RECEIVED: NÃO
WHATSAPP WEBHOOK: NÃO
EMAIL CONFIG: LOCAL MISSING
EMAIL SENT: NÃO
EMAIL RECEIVED: NÃO
SERVICE READY: código preservado; E2E real PENDING

COMMUNICATION_MODE: test (default; live não ligado)
ALLOWLIST: MISSING (local)
NO EXTERNAL DELIVERY: PASS (kill switch OFF; destino fora da lista → suppressed)

TESTES: PASS (13/13 hotfix 360)
REGRESSÃO: PASS (35.2.x 21 · 35.2.3 14 · 35.2.2 35 · 35.2.1 20+25 · 35.2 19 · 35.1 48)
RBAC: PASS (92/92)
LINT: PASS (0 errors; 35 warnings pré-existentes)
TYPECHECK: PASS
BUILD: PASS

P0: 0
P1: 0
P2: homologação visual DR ANDREIA + WhatsApp/e-mail reais PENDING

MIGRATION: NENHUMA nesta retomada
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
