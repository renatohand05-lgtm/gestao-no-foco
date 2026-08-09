# Phase 31.11 — Android Build RC

Objetivo: gerar APK interno (profile `internal`) e homologar em device Android real.

## Pré-requisitos de build (bloqueantes nesta sessão)

| Requisito | Status nesta máquina |
|-----------|----------------------|
| `eas login` ou `EXPO_TOKEN` | **AUSENTE** — `eas whoami` = Not logged in |
| `EAS_PROJECT_ID` / `eas init` | **AUSENTE** |
| Profile `internal` em `eas.json` | OK (APK, channel internal) |
| Expo Doctor | 20/20 |
| Android SDK / `ANDROID_HOME` | **AUSENTE** (fallback local inviável) |
| Device USB / emulador (`adb`) | **AUSENTE** |

## Comando canônico (quando credenciais existirem)

```bash
cd apps/mobile
npx eas-cli login   # ou export EXPO_TOKEN=...
npx eas-cli init    # gera projectId
npx eas-cli build --platform android --profile internal --non-interactive
```

Não publicar na Play Store. Não executar `eas submit`.

## Evidência desta sprint

Tentativa:

```text
npx eas-cli build --platform android --profile internal --non-interactive
→ An Expo user account is required to proceed.
```

## Homologação device

Adiada até existir APK instalável. Checklist em `docs/testing/evidence/31-11/DEVICE_QA.md`.
