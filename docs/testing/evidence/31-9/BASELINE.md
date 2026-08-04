# Sprint 31.9 — BASELINE

**Data:** 2026-08-04
**Branch:** `main` (= `origin/main` em `f377f31`)
**Missão:** Produtividade Mobile — busca global, scanner, comandos, favoritos, recentes, home adaptativa.

## Estado pré-implementação

| Check | Resultado |
|-------|-----------|
| Sprint 31.7 / 31.8 | Preservadas (working tree local) |
| Expo Doctor | **20/20** |
| Conflitos / merge | Não |
| Arquivos sensíveis | Não observados |

## Reuso

| Capacidade | Fonte |
|------------|--------|
| Busca master-data | `MasterDataSearchService` |
| Listagens `q=` | CRM/Estoque/Ops composes |
| Câmera | `expo-camera` (presente, não wired) |
| Auth mobile | Bearer + membership + RBAC modules |
| Offline | `@gof/cache/*` snapshots |

## Gaps

- Sem `/search` mobile
- Sem command palette
- Sem barcode wiring
- Sem favoritos/recentes locais
- Home sem área de produtividade

## Fora de escopo

Commit, push, deploy, EAS, SQL, IA, alteração Web.
