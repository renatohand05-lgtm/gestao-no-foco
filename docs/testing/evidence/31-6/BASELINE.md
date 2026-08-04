# Sprint 31.6 — BASELINE (pré-execução correta)

**Data:** 2026-08-04
**Branch:** `main`
**HEAD:** `cec3e22` fix(ui): repair dropdown menus logout and manifest

## Estado do repositório

| Check | Resultado |
|-------|-----------|
| Merge/rebase pendente | Não |
| Trabalho 31.4 / 31.4.1 / 31.5 | Preservado (untracked + mods local) |
| `git diff --check` | Limpo |
| Arquivos sensíveis no diff | Não |
| Node processes | Vários `node` ativos (não Metro dedicado); sem kill destrutivo |

## Diff tracked (resumo)

- `apps/mobile/app/(app)/_layout.tsx` — tabs CRM + Estoque
- `apps/mobile/src/api/mobile-api.ts` — clients CRM/Estoque
- `package.json` — scripts 31.4 / 31.5

## Expo Doctor (antes da correção)

**19/20** — mismatches:

| Pacote | Esperado (SDK 57) | Encontrado |
|--------|-------------------|------------|
| react-native-gesture-handler | ~2.32.0 | 3.1.0 (major) |
| expo | ~57.0.10 | 57.0.9 |
| expo-constants | ~57.0.9 | 57.0.8 |
| expo-image | ~57.0.2 | 57.0.1 |
| expo-linking | ~57.0.5 | 57.0.4 |
| expo-router | ~57.0.10 | 57.0.9 |
| expo-updates | ~57.0.12 | 57.0.11 |

## Scripts 31.6

Ainda **não existiam** (Missing script ≠ falha de produto). Serão criados após implementação.

## Escopo canônico a reutilizar

- `OrdemServicoService`, `OsDashboardService`, `AgendaEventService`
- `MecanicoService`, `OsMecanicoService`, `MecanicosDashboardService`
- `VeiculoService` (+ histórico via `list({ veiculo_id })`)
- `ClienteService` / `Cliente360Service`
- `CentroOperacoesService`, `AlertasOperacionaisService`, `RecursosOcupacaoService`
- RBAC: `os.*`, `agenda.*`, `mecanicos.*`, `clientes.*`, `centro_operacoes.*`, `dashboard.operacional`
