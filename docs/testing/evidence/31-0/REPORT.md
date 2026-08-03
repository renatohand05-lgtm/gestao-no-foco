# Sprint 31.0 — Mobile Foundation · REPORT

**Data:** 2026-08-03
**Classificação:** **APROVADA COM RESSALVAS**

## Decisão de arquitetura

Web Next.js **permanece na raiz**. Mobile em `apps/mobile` (Expo Router SDK 57). Packages em `packages/*`.
Motivo: baixo risco para Vercel/CI. Migração `apps/web` adiada.

## Estrutura criada

- `apps/mobile` — Expo Router, auth mock, tenant/branch, shell, DS, API client, offline/push contracts
- `packages/{design-tokens,domain,schemas,api-contracts,rbac-contracts,config,utils}`
- Docs architecture + threat model
- Scripts root `mobile:*` + 10 suites `test:phase31-mobile-*`

## Stack

Expo 57 · RN 0.86 · Expo Router · TanStack Query · Zustand · Zod · RHF · SecureStore · Network

## Autenticação / Multi-tenant

Estados completos · SecureStore · mock login · tenant/branch selectors · query keys com tenant/filial · clear cache na troca

## Segurança

Threat model documentado · sanitize logs · sem service role · sem secrets versionados · push/câmera/biometria não ativados

## Testes

| Gate | Resultado |
|------|-----------|
| lint (web) | 0 errors |
| build (web) | PASS (apps/packages excluídos do tsconfig) |
| release-candidate | 65 PASS |
| rbac | 92 PASS |
| phase31 suites (10) | **101 PASS · 0 FAIL** |
| mobile:typecheck/lint/test | PASS |
| mobile:doctor | 19/20 (ressalva duplicate react) |

## Android / iOS

- Android homologado: **PARCIAL** (config + suites; sem emulator/device nesta sessão)
- iOS preparado: **PARCIAL** (bundle/EAS; sem Mac)

## Pendências

### Bloqueantes
Nenhuma para encerrar 31.0 foundation.

### Não bloqueantes
- Deduplicar React via workspaces/Turborepo (31.1)
- Auth real + API gateway (31.1)
- Boot timing em device
- EAS development build
- Sync progressivo `lib/rbac` → `@gof/rbac-contracts`

## Checklist

1. arquitetura mobile definida: **SIM**
2. app Expo inicial funcionando: **SIM** (typecheck/lint/test; doctor com ressalva)
3. web preservada: **SIM**
4. packages compartilhados funcionando: **SIM**
5. autenticação foundation pronta: **SIM** (mock)
6. multi-tenant foundation pronta: **SIM**
7. Android homologado: **PARCIAL**
8. iOS preparado: **PARCIAL**
9. segurança mobile preparada: **SIM**
10. pronto para commit: **SIM** (não executado — restrição da sprint)
11. pronto para Sprint 31.1: **SIM**

**Sem commit / push / deploy / lojas / SQL remoto.**
