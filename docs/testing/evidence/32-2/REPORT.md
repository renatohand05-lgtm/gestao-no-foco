# Sprint 32.2 — Piloto controlado + observabilidade + qualidade

**Data:** 2026-08-09  
**Branch:** `main`  
**Classificação:** **PRONTO COM RESSALVAS**

Ressalvas: performance device ainda TBD (coleta no piloto); sink de telemetria é console sanitizado (sem vendor remoto); Build 118 necessária para runtime — homologar no iPhone antes de ampliar usuários.

---

## Checklist obrigatório

| # | Item | Resultado |
|---|------|-----------|
| 1 | Build baseline | **117** (`fa3cd663-…`, commit `954a677`) — ver `BASELINE.md` |
| 2 | versão | `1.10.0` |
| 3 | observabilidade implementada | **SIM** — `mobileTelemetry` (`apps/mobile/src/observability/telemetry.ts`) |
| 4 | request correlation | **SIM** — `x-gof-request-id` no client; echo em memberships/permissions + `readMobileRequestId` |
| 5 | error taxonomy | **SIM** — `apps/mobile/src/errors/taxonomy.ts` (9 categorias + mensagens UX) |
| 6 | qualidade de dados | **SIM** — matriz `DATA_QUALITY.md`; CRM empty≠error corrigido |
| 7 | Financeiro parity | **PASS** (suites phase31 summary; fórmulas intactas) |
| 8 | CRM parity | **PASS** + fix oportunidades fail → KPIs null / sem pipeline-vazio falso |
| 9 | Estoque parity | **PASS** (padrão null/`unavailable` mantido) |
| 10 | Operação parity | **PASS** |
| 11 | RBAC | **PASS** (sem enfraquecimento) |
| 12 | tenant isolation | **PASS** (padrão existente + headers) |
| 13 | offline | **PASS** (telemetria OFFLINE_*; sessão não limpada por rede — policy existente) |
| 14 | segurança | **APROVADO COM RESSALVAS** — `SECURITY.md` |
| 15 | performance | **Baseline doc** — métricas físicas TBD no piloto |
| 16 | Doctor | **20/20** |
| 17 | lint | **PASS** |
| 18 | typecheck | **PASS** |
| 19 | tests | **PASS** (`mobile:test` 34/0; phase32-2 28/0; parity 19/0; CRM/finance/startup) |
| 20 | produção | **OK** — `/api/health` 200; memberships sem token **401** |
| 21 | piloto preparado | **SIM** — `docs/pilot/PILOT_01.md` + checklist + release process |
| 22 | nova build necessária | **SIM** (runtime: telemetry, taxonomy, CRM compose, integrity 32.2) |
| 23 | build final | **118** (preencher após EAS) |
| 24 | pendências | Homologar 118 no iPhone; coletar p50/p95; convites TestFlight manuais |
| 25 | blockers | Nenhum gate crítico |
| 26 | pronto para piloto controlado | **SIM COM RESSALVAS** (após homologação física da 118) |

---

## Entregas técnicas

### Observabilidade

Eventos: `APP_STARTED`, `APP_READY`, `LOGIN_*`, `SESSION_*`, `TENANT_SELECTED`, `BRANCH_SELECTED`, `RBAC_LOADED`, `API_FAILED`, `OFFLINE_*`, `BIOMETRIC_*`, `UNHANDLED_ERROR`.  
Sanitização: sem senha/token/anon/PII; `sanitizeForLog` ampliado.

### CRM qualidade

`lib/mobile/crm-compose.ts`: falha de oportunidades → KPIs monetários `null` + `unavailable`; alerta `pipeline-vazio` só se carga OK; follow-ups falhos → `unavailable: follow_ups`.

### Docs

- `docs/testing/evidence/32-2/BASELINE.md`
- `DATA_QUALITY.md`, `SECURITY.md`, `PERFORMANCE.md`, `REPORT.md`
- `docs/pilot/PILOT_01.md`, `PILOT_01_CHECKLIST.md`, `RELEASE_PROCESS.md`

---

## Build 118

Preenchido após `eas build --profile production`:

| Campo | Valor |
|-------|-------|
| Build number | _(após EAS)_ |
| Build ID | _(após EAS)_ |
| Commit | _(SHA do commit 32.2)_ |
| runtimeVersion | `1.10.0-pilot-32.2` |
| TestFlight submit automático | **NÃO** |
