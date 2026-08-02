# Sprint 29.8 — Baseline (pré-correção / pré-homologação)

**Gerado em:** 2026-08-02  
**Sprint:** 29.8 Enterprise Release Audit

## Git

| Campo | Valor |
|-------|--------|
| Branch | `main` |
| HEAD | `490fbe4` (short) |
| Sync | `main...origin/main` (working tree sujo; branch alinhada ao remote em commits) |
| Conflitos | Nenhum |
| `git diff --check` | Apenas avisos CRLF (sem conflict markers) |

## Working tree

| Métrica | Valor |
|---------|--------|
| Arquivos tracked alterados/removidos (diff vs HEAD) | 165 files |
| Linhas adicionadas | +750 |
| Linhas removidas | −5686 |
| Untracked (aproximado) | 120 paths (inclui evidências 27-8, 29-0…29-7, lib/executive-intelligence, docs Fase 29, etc.) |

## Escopo da working tree

Alterações acumuladas das Sprints **29.0–29.7** (ainda **sem commit**):

- Arquitetura / barrels / performance / permissions / UX
- Executive Intelligence + Enterprise Engine unification
- Homologação estrutural 29.7
- Evidências de testes sob `docs/testing/evidence/29-*`

## Regras desta sprint

- Nenhuma alteração descartada
- Sem commit / push / deploy
- Sem `git reset --hard` / `git clean`

## Ambiente observado no início

- `npm run dev` ativo (terminal local)
- Logs recentes: rotas `/teste-renato-01/dashboard` HTTP 200 (sessão browser do usuário)
- Trace Turbopack histórico client→`supabase/server` via loader (código atual da fachada usa `ops-executive-intelligence` puro — validar em rebuild)
- `docs/testing/playwright/.auth/user.json` **ausente** no baseline (browser QA precisa de `npm run test:login` ou sessão capturada)
