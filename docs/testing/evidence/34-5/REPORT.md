# Sprint 34.5 — UX primeiro uso + isolamento de mocks + prontidão de piloto

**Data fechamento código:** 2026-08-14
**Data homologação visual production:** 2026-08-14
**Branch:** `main`
**Commit feat:** `09cd7b5`
**Tipo:** UX piloto — sem billing / Asaas / Vercel / 34.6 / redesign
**34.4:** HOMOLOGADA

## Status final

**SPRINT 34.5: HOMOLOGADA — GO**

**HOMOLOGADA PRODUCTION:** **SIM** (smoke visual em dispositivo móvel real)

| Critério | Status |
|---|---|
| MOCKS | **PASS** |
| NOTIFICATIONS | **HIDDEN** |
| INTEGRATIONS | **PARTIAL** (import real; externas Em breve) |
| FIRST USE UX | **PASS** |
| ONBOARDING | **PASS** |
| EMPTY STATES | **PASS** |
| NAVIGATION | **PASS** |
| MENU | **PASS** |
| DASHBOARD | **PASS** |
| FORMULÁRIOS | **PASS** |
| RESPONSIVE | **PASS** (smoke mobile real) |
| MOBILE WEB | **PASS** |
| ACCESSIBILITY | **PARTIAL** (dívida P2; sem blocker no smoke) |
| DASHBOARD DATA HONESTY | **PASS** |
| TENANT CLEAN START | **PASS** |
| RBAC UI | **PASS** |
| MULTIEMPRESA | **PASS** |
| P0 REGRESSION | **PASS** |
| Billing | **FROZEN SAFE** |

## Homologação visual production (evidência Renato)

Smoke manual em **dispositivo móvel real** na aplicação production.

| Item | Resultado |
|---|---|
| Smoke geral | **PASS** |
| Responsividade | **PASS** — sem problemas bloqueantes |
| Mobile web | **PASS** |
| Navegação / menu | **PASS** |
| Dashboard | **PASS** |
| Formulários | **PASS** |
| Multiempresa | **PASS** |
| First use UX | **PASS** |
| Accessibility | **PARTIAL** — sem blocker; dívida P2 mantida |

Nenhuma alteração automática em Supabase / Vercel / Asaas nesta homologação.

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

- Smoke production em mobile real: **PASS** (sem blocker de usabilidade/responsividade).
- Accessibility: **PARTIAL** — labels/ARIA existentes; WCAG completo permanece P2.

## Testes (revalidação pós-homologação)

| Suite | Resultado |
|---|---|
| `test:phase34-5-pilot-ux` | **13 PASS** |
| `test:phase34-4-access-journey` | **14 PASS** |
| `test:phase34-3-p1-mutation-auth` | **9 PASS** |
| `test:phase34-2-p0-tenant-rls` | **12 PASS** |
| `test:rbac` | **92 PASS** |
| lint | **PASS** (0 errors, 31 warnings pré-existentes) |
| typecheck (`tsc` via `next build`) | **PASS** |
| build | **PASS** |
| `git diff --check` | **PASS** |

## Migration

**NENHUMA**

## Novas envs

**NENHUMA**

## P0 / P1

**P0 abertos:** 0

**P1 internos abertos:** 0

**P1 externo:** `ASAAS_PRODUCTION_API_KEY_BLOCKER` (billing congelado)

## Billing

**FROZEN SAFE**

## Próxima sprint

**34.6** — observabilidade / backup / PITR / runbooks — **recomendado iniciar após este fechamento** (não iniciada automaticamente aqui).
