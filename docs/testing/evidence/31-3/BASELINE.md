# Sprint 31.3 — BASELINE

**Data:** 2026-08-03
**Branch:** `main` (sincronizada com `origin/main` em `6a60706`)
**Working tree:** Sprint 31.2 ainda local (dashboard mobile) + início 31.3

## Git

| Check | Resultado |
|-------|-----------|
| Branch | `main`…`origin/main` |
| HEAD | `6a60706` fix invites |
| 31.2 local preservada | SIM (dashboard compose/API/UI uncommitted) |
| `git diff --check` | PASS |
| Sensíveis | Nenhum `.env` real |

## Herança 31.2

- `GET /api/mobile/v1/tenants/:id/dashboard`
- Compose cockpit V2
- React Query + offline snapshot
- Homolog 31.2: 6 PASS

## Ambiente Android

Não revalidado nesta baseline — esperar **PARCIAL / NÃO** para device QA.

## Escopo 31.3

Financeiro mobile enxuto: summary, CAP, CR, fluxo, DRE, aprovações (se runtime existir), detalhe, offline read-only — **sem** duplicar fórmulas web.
