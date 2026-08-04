# Checkpoint 31.6-release — DEPENDENCIES

## Expo Doctor

**20/20 PASS** (sessão de release)

## gesture-handler

| Item | Valor |
|------|-------|
| `apps/mobile/package.json` | `~2.32.0` |
| Resolvido | `2.32.0` |
| Override raiz | `"react-native-gesture-handler": "2.32.0"` |
| Duplicata crítica | Não (único 2.32.0, deduped sob expo-router) |

## Pacotes Expo (workspace mobile)

Compatíveis com SDK 57 via `expo install --fix` (sprint 31.6): expo ~57.0.10, expo-constants ~57.0.9, expo-image ~57.0.2, expo-linking ~57.0.5, expo-router ~57.0.10, expo-updates ~57.0.12.

## Workspaces

`apps/*`, `packages/*` íntegros. Override de `react`/`react-dom` 19.2.3 pré-existente + gesture-handler justificado para dedupe monorepo (não `expo.install.exclude`).
