# Sprint 31.0.1 — Baseline Monorepo Hardening

**Data:** 2026-08-03
**Objetivo:** Expo Doctor 20/20 · workspaces · Turbo · zero React duplicado

## Problema atual

| Local | react |
|-------|-------|
| `node_modules/react` (raiz) | 19.2.4 |
| `apps/mobile/node_modules/react` | 19.2.3 |

expo-doctor: **19/20** (duplicate react)

## Plano

1. npm workspaces (`apps/*`, `packages/*`)
2. Unificar React via overrides (versão única compatível Expo 57 + Next 16)
3. Remover `apps/mobile/node_modules` aninhado
4. Turbo + Metro + TS references + Prettier
5. Gates 20/20
