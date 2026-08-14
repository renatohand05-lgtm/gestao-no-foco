# Sprint 34.5 — UX primeiro uso + isolamento de mocks + prontidão de piloto

**Data:** 2026-08-14
**Branch:** `main`
**Tipo:** UX piloto — sem billing / Asaas / Vercel / 34.6 / redesign
**34.4:** HOMOLOGADA

## Status

**SPRINT 34.5: GO (código)** — homologação visual/manual a critério de Renato

| Critério | Status |
|---|---|
| MOCKS | **PASS** |
| NOTIFICATIONS | **HIDDEN** |
| INTEGRATIONS | **PARTIAL** (import real; externas Em breve) |
| FIRST USE UX | **PASS** |
| ONBOARDING | **PASS** |
| EMPTY STATES | **PASS** |
| NAVIGATION | **PASS** |
| RESPONSIVE | **PARTIAL** (sem blocker; padrões premium existentes) |
| ACCESSIBILITY | **PARTIAL** (labels/ARIA existentes; sem WCAG full) |
| DASHBOARD DATA HONESTY | **PASS** |
| TENANT CLEAN START | **PASS** |
| RBAC UI | **PASS** |
| MULTIEMPRESA | **PASS** (preservado) |
| P0 REGRESSION | **PASS** |
| Billing | **FROZEN SAFE** |

## Inventário de mocks (ação)

| Superfície | Antes | Depois 34.5 |
|---|---|---|
| Integration Hub mock (webhooks/DLQ/scheduler) | Visível como hub “pronto” | Landing **Em breve** + CTA importação |
| Nav Integrações | `/integracoes` (hub mock) | `/integracoes/importar` (real) |
| Automações + seed demo | Menu + regras fictícias | **Oculto** no menu; página Em breve; **sem seed** |
| Sino de notificações | Disabled “em breve” | **Removido** do header |
| Design System em Configurações | Card interno | **Oculto** |
| Canal comercial (copy técnica) | `tem_canal=false` / mock | Mensagem de negócio honesta |
| Assinatura/Config copy | “tenant”, “OWNER”, “RBAC” | Linguagem de negócio |

Componentes mock (`integration-hub-view`, `automacoes-central`) **permanecem no repo** para desenvolvimento futuro, mas não são a UX do piloto.

## Jornada primeiro uso

Preservada e reforçada:

1. Login → empresa / onboarding
2. Dashboard com `OnboardingResumeCard` (progresso + Continuar + dispensar)
3. Empty states com CTA: clientes, produtos, vendas, estoque
4. Switcher multiempresa intacto
5. Nova empresa nasce limpa (`create-tenant` sem seed demo)

## Responsividade / a11y

- Não houve redesign; mantidos padrões do layout premium (sidebar, header, empty states com `role="status"`, botões com `aria-label`).
- Classificado **PARTIAL** sem blocker crítico.
- Prioridade futura (P2): smoke visual em 1366/tablet/mobile web.

## Testes (revalidação)

| Suite | Resultado |
|---|---|
| `test:phase34-5-pilot-ux` | **13 PASS** |
| `test:phase34-4-access-journey` | **14 PASS** |
| `test:phase34-3-p1-mutation-auth` | **9 PASS** |
| `test:phase34-2-p0-tenant-rls` | **12 PASS** |
| `test:rbac` | **92 PASS** |
| lint | **PASS** (0 errors) |
| typecheck (`tsc` via `next build`) | **PASS** |
| build | **PASS** |
| `git diff --check` | **PASS** |

## Migration

**NENHUMA**

## Novas envs

**NENHUMA**

## P1

**Internos abertos:** 0 novos

**Externos:** `ASAAS_PRODUCTION_API_KEY_BLOCKER` (billing congelado)

## Billing

**FROZEN SAFE**

## Próxima sprint

**34.6** — observabilidade / backup / PITR / runbooks — **somente após homologação 34.5** (não iniciada automaticamente).
