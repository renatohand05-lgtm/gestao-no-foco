# Sprint 31.11.1 — BASELINE

**Data:** 2026-08-04
**Branch:** `main` (= `origin/main` em `c094399`) + working tree 31.10/31.11
**Missão:** iOS cloud build RC, registro de device, preparação TestFlight — **sem submit automático**.

## Pré-checks

| Check | Resultado |
|-------|-----------|
| Sprint 31.10 RC | Preservada (working tree) |
| Docs 31.11 Android | Preservados |
| Expo Doctor (pré) | 20/20 |
| bundleIdentifier | `com.gestaonofoco.app` |
| version / buildNumber | `1.10.0` / `110` |
| Certificados no Git | Nenhum |
| Segredos versionados | Nenhum observado |
| Build Android necessário | **Não** (foco iOS) |

## Autenticação (detecção)

| Item | Status |
|------|--------|
| `eas whoami` | **Not logged in** |
| `EXPO_TOKEN` no ambiente | **Ausente** |
| `eas project:info` | Falhou (exige conta) |

**Parada obrigatória antes de build** — ver `EAS_AUTH.md`.
