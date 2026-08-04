# Checkpoint 31.6-release — REPORT FINAL

**Data:** 2026-08-04  
**Classificação:** **SPRINTS 31.4 A 31.6 PUBLICADAS COM RESSALVAS**

## Commits / Push

| Item | Valor |
|------|-------|
| Feature commit | `2178bed` — `feat(mobile): concluir CRM, Estoque e Operação Mobile da Fase 31` |
| Docs commit | `bac1e82` — `docs(testing): registrar checkpoint mobile até Sprint 31.6` |
| Push | **SIM** — `main` = `origin/main` |
| Ahead / behind | 0 / 0 |
| Force push | Não |

## Vercel

| Item | Valor |
|------|-------|
| Status | **Ready** |
| Ambiente | **Production** |
| Deploy id | `dpl_FCertgPdiag4fEXYjkcSTuwwuycE` |
| URL | https://gestao-no-foco-9kmcqdowm-renato16.vercel.app |
| Alias ativo | https://gestao-no-foco.vercel.app |
| Commit | `2178bed` (push main → deploy automático) |

## Gates (pré-commit)

| Gate | Resultado |
|------|-----------|
| Expo Doctor | **20/20** |
| mobile lint / typecheck / test | PASS |
| homolog-31-4 | 9 PASS / 0 FAIL |
| homolog-31-5 | 8 PASS / 0 FAIL |
| homolog-31-6 | 11 PASS / 0 FAIL |
| phase31 dashboard/finance regressão | PASS |
| lint | 0 errors (28 warnings pré-existentes) |
| test:rbac | 92 PASS |
| test:release-candidate | 65 PASS |
| build | PASS |

## Smoke produção

Fonte: `docs/testing/evidence/31-6-release/prod-smoke.json` — **21 PASS / 0 FAIL**

| Grupo | Resultado |
|-------|-----------|
| `/`, `/login`, `/api/health`, manifest | 200 |
| Mobile CRM/Estoque/Operação/Financeiro/Dashboard sem Bearer | **401** |
| Dashboard, Financeiro, CRM, Estoque, Operação, Equipe, Analytics, Automações, Integrações | rota válida (redirect login sem sessão prod) |
| Console hydration / ChunkLoadError | 0 |
| pageerrors | 0 |
| Deep-auth com storageState local no domínio prod | **NÃO** (ressalva não bloqueante) |

## Escopo versionado

| Módulo | Status |
|--------|--------|
| CRM Mobile (+ hardening 31.4.1) | Versionado |
| Estoque / Compras Mobile | Versionado |
| Operação Mobile (OS, agenda, equipe, veículos, clientes, notificações) | Versionado |
| APIs mobile Bearer + membership + RBAC | Versionado |
| Offline somente leitura | Versionado |
| Dependências Expo / Doctor 20/20 | Versionado |
| Web business rules | Preservadas (sem alteração de fórmulas) |

## Segurança / Dependências

Ver `SECURITY.md` e `DEPENDENCIES.md` neste diretório.

## Android QA / iOS readiness

| Item | Status |
|------|--------|
| Android device QA | **Não executado** |
| iOS device QA | **Não executado** |
| EAS Build / Submit / loja | **Não executado** (fora de escopo) |
| Cold / Warm start | **Não medidos** |

## Pendências

### Bloqueantes

Nenhuma para o checkpoint de versionamento/publicação web.

### Não bloqueantes

- Device QA Android/iOS (Sprint 31.7+)
- Deep-auth smoke em produção (storageState local ≠ domínio Vercel)
- Cold/Warm metrics
- EAS Build / Submit quando autorizado

## Checklist final

1. CRM Mobile versionado: **SIM**
2. Estoque Mobile versionado: **SIM**
3. Operação Mobile versionada: **SIM**
4. Expo Doctor 20/20: **SIM**
5. web preservada: **SIM**
6. app publicado em loja: **NÃO**
7. pronto para Sprint 31.7: **SIM**
