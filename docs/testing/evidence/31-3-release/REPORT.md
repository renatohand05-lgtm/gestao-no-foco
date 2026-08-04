# Checkpoint Mobile — Sprints 31.2 e 31.3 PUBLICADAS COM RESSALVAS

**Data:** 2026-08-03  
**Commit:** `ecc1aa1` — `feat(mobile): concluir Dashboard e Financeiro Mobile da Fase 31`  
**Branch:** `main` = `origin/main` (ahead 0 / behind 0)

## Classificação

**PUBLICADAS COM RESSARVAS**

- Código 31.2 + 31.3 versionado e em produção web (APIs mobile).
- App **não** publicado em lojas (sem EAS Build/Submit).
- Android/iOS device QA não executado nesta sessão.

## Gates (pré-push)

| Gate | Resultado |
|------|-----------|
| `lint` | PASS (0 errors) |
| `build` (Next.js) | PASS |
| `test:release-candidate` | 65 PASS · 0 FAIL |
| `test:rbac` | 92 PASS · 0 FAIL |
| `mobile:doctor` | **20/20 PASS** (após alinhar `react-native-gesture-handler` ~3.1.0) |
| `mobile:typecheck` | PASS |
| `mobile:lint` | PASS |
| `mobile:test` | 2 PASS · 0 FAIL |
| `test:homolog-31-2` | 6 PASS · 0 FAIL |
| `test:homolog-31-3` | 11 PASS · 0 FAIL |

## Commit / Push

- Commit criado sem `--amend` / sem `--no-verify`.
- Push: `6a60706..ecc1aa1` → `origin/main`.
- Sem arquivos sensíveis (`.env`, tokens, keystores, dumps).

## Vercel

| Item | Valor |
|------|-------|
| Deployment | `gestao-no-foco-rn5k6wkhu-renato16.vercel.app` |
| ID | `dpl_BM5TdkAE76kprq7fSZYzoPGQKgEy` |
| Status | **Ready** |
| Target | **Production** |
| Alias | `https://gestao-no-foco.vercel.app` ativo no deploy novo |

## Smoke web (produção)

| Path | Status |
|------|--------|
| `/` | 200 |
| `/login` | 200 |
| `/api/health` | 200 (`ok`, supabase ok) |
| `/api/status` | 200 |

Rotas autenticadas / APIs mobile sem Bearer retornam 3xx/401 (não 500) — ver log da sessão.

## Versionado

- Dashboard Executivo Mobile (31.2): **SIM**
- Financeiro Mobile (31.3): **SIM**
- Web preservada (fórmulas/DRE/RBAC canônico): **SIM**
- App em loja: **NÃO**

## Pendências não bloqueantes

1. QA real em device Android/iOS.
2. Aprovações financeiras nativas (hoje PARCIAL → web).
3. CRUD CAP/CR e baixas permanecem na web.
4. EAS Build/Submit quando for o momento de distribuição.

## Checklist final

1. Dashboard Mobile versionado: **SIM**
2. Financeiro Mobile versionado: **SIM**
3. web preservada: **SIM**
4. app publicado em loja: **NÃO**
5. pronto para Sprint 31.4: **SIM**
