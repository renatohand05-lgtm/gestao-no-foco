# Fase 31.0.1 — Monorepo Hardening

## Objetivo

Endurecer workspaces, eliminar React duplicado e obter **expo-doctor 20/20** sem features novas.

## Decisões

| Item | Escolha |
|------|---------|
| Workspaces | npm `apps/*` + `packages/*` |
| React unificado | **19.2.3** (overrides + deps root/mobile) |
| Metro | `watchFolders` + `nodeModulesPaths` · sem `disableHierarchicalLookup` |
| Turbo | `turbo.json` com build/lint/typecheck |
| Prettier | `.prettierrc.json` raiz |
| TS | `tsconfig.base.json` · mobile usa Expo base + strict |

## Resultado

- Sem `apps/mobile/node_modules/react`
- Uma árvore `react@19.2.3` na raiz
- expo-doctor **20/20**
- Web Next.js preservada na raiz

## Rollback

Remover `workspaces`/`overrides`, restaurar `apps/mobile` install isolado (não recomendado).
