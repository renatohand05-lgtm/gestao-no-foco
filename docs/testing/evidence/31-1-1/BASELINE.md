# Sprint 31.1.1 — BASELINE

**Data:** 2026-08-03
**Branch:** `main` (sincronizada com `origin/main` em `e765e52`)
**Escopo local:** Sprints 31.0 + 31.0.1 + 31.1 (working tree dirty, sem commit)

## Git

| Check | Resultado |
|-------|-----------|
| Branch | `main` |
| Tracking | `origin/main` up to date |
| `git diff --check` | PASS (exit 0) |
| Merge/rebase pendente | Não |
| Sensíveis no tree | Nenhum `.env` real; sem keystore/cert |

## Ambiente Android (detecção)

| Item | Status |
|------|--------|
| `adb` | **NÃO encontrado** |
| `java` | **NÃO encontrado** |
| `emulator` | **NÃO encontrado** |
| `ANDROID_HOME` / `ANDROID_SDK_ROOT` | Vazios |
| Android Studio / SDK em paths comuns | **Ausente** |
| Dispositivo USB Android | **Não detectado** |

**Classificação ambiente:** nenhum ambiente Android disponível nesta máquina.

## Monorepo / foundation (pré-gate)

| Item | Esperado |
|------|----------|
| workspaces `apps/*` `packages/*` | Presente (31.0.1) |
| Expo Doctor | 20/20 (revalidar nesta sprint) |
| Auth híbrida 31.1 | Presente |
| Deep links | `gof://auth/reset`, `gof://auth/callback` |

## Ressalvas herdadas (31.1)

1. Android QA device/emulador
2. iOS só readiness estática
3. Filiais via `allowContinueWithoutBranch`
4. Recovery depende de Redirect URLs no Supabase
5. Sem commit/push ainda

## Objetivo 31.1.1

Homologar o que for executável, documentar bloqueios honestamente, versionar mobile no git, push web, preparar 31.2 — **sem** Dashboard mobile, **sem** publish store, **sem** migration.
