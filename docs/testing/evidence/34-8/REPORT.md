# Sprint 34.8 — Release Candidate + Go-Live Readiness

**Data:** 2026-08-14  
**Branch:** `main`  
**Commit:** `4bb0eef7bce4c6064d18be25e3f1070d0d1c010f`  
**Tipo:** Auditoria final RC — sem features de negócio / billing / Asaas / PITR / 33.11  
**34.7:** GO + homologação production **PASS** (informado)

## Decisão

**SPRINT 34.8: GO**  
**RELEASE CANDIDATE: GO** (para beta controlado sem cobrança)

| Modalidade | Decisão | Motivo |
|---|---|---|
| Piloto interno | **GO** | Segurança + core + reports PASS |
| Cliente beta | **CONTROLLED GO** | Sem cobrança; suporte manual; PITR OFF aceito |
| Cliente real sem cobrança | **CONTROLLED GO** | Mesmo modelo do beta; tenant novo |
| Cliente pago | **NO-GO** | `ASAAS_PRODUCTION_API_KEY_BLOCKER` |
| Escala | **NO-GO** | Monitoring parcial + PITR OFF + billing externo |

**Billing desacoplado do beta:** **SIM** — enforcement OFF; core aberto.

## Consolidado 34.1–34.7

| Sprint | Tema | Status |
|---|---|---|
| 34.1 | Auditoria | Base |
| 34.2 | Tenant/RLS P0 | PASS / prod |
| 34.3 | Mutations/storage | PASS / prod |
| 34.4 | Auth/invite | PASS / homolog |
| 34.5 | UX/mocks/mobile | PASS / homolog |
| 34.6 | Ops/logging/runbooks | PASS |
| 34.7 | Reports | PASS / homolog |

Regressão automatizada 34.2–34.8 + rbac: ver seção Testes.

## Security gate

| Item | Status |
|---|---|
| TENANT ISOLATION | **PASS** |
| CROSS-TENANT | **PASS** |
| INACTIVE REVOCATION | **PASS** |
| RBAC | **PASS** |
| PRIVILEGE ESCALATION | **PASS** (contratos) |
| RLS | **PASS** |
| STORAGE RLS | **PASS** |
| SERVICE ROLE | **PASS** (não exposto client) |
| AUTH / PASSWORD / INVITE | **PASS** |
| MULTIEMPRESA | **PASS** |

## Core modules

| Módulo | Classificação |
|---|---|
| Cliente | **GO** |
| Produto/serviço | **GO** |
| Estoque | **GO** |
| Compra | **PARTIAL** (funcional; sem exigir perfeição) |
| Venda | **GO** |
| Financeiro | **GO** |
| OS | **GO** |
| Agenda | **GO** / **PARTIAL** conforme segmento |
| Equipe | **GO** |
| CRM | **GO** / **PARTIAL** (profundidade) |
| Tributário | **PARTIAL** (avançado; não blocker beta) |
| Dashboard | **GO** |
| Relatórios | **GO** |

## First client journey

Fluxo conceitual sem ponto morto crítico: acesso → empresa → onboarding → cliente → produto → venda → financeiro → estoque → relatório → convite → troca empresa → recuperar senha → suporte.

Pontos de atenção (não blockers): integrações “Em breve”; Assinatura sem checkout no piloto (intencional).

## Clean start

Empresa nova: sem seed demo (contrato 34.5). Assinatura piloto sem checkout sandbox confuso (ajuste UI 34.8).

## Production config (sem secrets)

| Config | Status |
|---|---|
| Supabase Auth URLs | **READY** (homolog 34.4) |
| Storage CRM | **READY** |
| Backup diário | **READY** / **PASS** |
| PITR | **OPTIONAL** / **NOT ENABLED** |
| Vercel domain | **READY** |
| Vercel deploy | **READY** (auto) |
| Env vars core | **READY** |
| Feature flags analytics Excel/PDF | **OPTIONAL** OFF |
| Sandbox billing | **READY** frozen; UI piloto sem checkout |

## Backup / monitoring / performance

| Item | Classificação |
|---|---|
| Backup diário | **PASS** |
| PITR | **NOT ENABLED** — risco **ACCEPTABLE** para 1º cliente controlado |
| Recovery runbook | **PASS** |
| Logging / requestId / health | **PASS** |
| Sentry | **PARTIAL** — **NON-BLOCKING** |
| Aging ≤2k / ABC ≤500 | **WATCH** (OK para piloto) |
| A11y | **P2** residual |

## Matriz GO / NO-GO

| Uso | Decisão | Blockers |
|---|---|---|
| PILOTO INTERNO | **GO** | — |
| CLIENTE BETA | **CONTROLLED GO** | Nenhum interno; limites BETA_SCOPE |
| CLIENTE REAL SEM COBRANÇA | **CONTROLLED GO** | Idem |
| CLIENTE PAGO | **NO-GO** | Asaas production key |
| ESCALA | **NO-GO** | PITR + monitoring + billing |

## Mudança de código nesta sprint

- UI Assinatura: modo piloto esconde checkout/sandbox técnico (`pilotBillingFrozen`).
- Docs operacionais RC / first client / beta / test tenants / rollback.
- Suite `phase34-8`.

**Migration:** NENHUMA  
**Novas envs:** NENHUMA

## Testes

```text
npm run test:phase34-8-release-candidate
(+ 34.2–34.7, test:rbac, lint, tsc, build)
```

## Homologação manual RC (máx. 10)

1. Deploy production = SHA deste release  
2. `/api/status` → `billing.frozen: true`  
3. Login owner em **tenant novo** (não teste-*)  
4. Assinatura: mensagem piloto **sem** formulário checkout  
5. Cliente → produto → venda → dashboard coerente  
6. Aging coerente  
7. Convite ou recuperar senha (1 dos dois)  
8. Mobile: dashboard legível  
9. Troca empresa (se multi)  
10. Confirmar suporte tem [FIRST_CLIENT_CHECKLIST.md](../../operations/FIRST_CLIENT_CHECKLIST.md)

**HOMOLOGAÇÃO MANUAL: PENDING** (RC smoke)

## P0 / P1

- P0 internos: **0**
- P1 internos: **0**
- P1 externo: `ASAAS_PRODUCTION_API_KEY_BLOCKER`
- P2: ~dezenas (a11y, monitoring, PITR, analytics aliases)

## Próxima ação

Renato: executar smoke RC (10 itens) em production e criar o **primeiro tenant beta** usando `FIRST_CLIENT_CHECKLIST.md` — **sem** ativar cobrança.

**Não iniciar outra sprint automaticamente. Não iniciar 33.11.**
