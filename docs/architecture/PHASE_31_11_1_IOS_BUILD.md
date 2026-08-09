# Phase 31.11.1 — iOS Cloud Build RC / TestFlight prep

Foco migrado de Android para **iOS** (iPhone disponível).

## Readiness

- Identidade RC 31.10 preservada
- `ios.bundleIdentifier` = `com.gestaonofoco.app`
- `buildNumber` = `110`, `version` = `1.10.0`
- Usage descriptions: Face ID, câmera, biblioteca de fotos
- `eas.json`: profiles development / preview / **internal** / production com bloco iOS
- Caminho A: distribution `internal` + `eas device:create`
- Caminho B: production build → TestFlight via `eas submit` **somente com autorização**

## Bloqueio atual

`eas whoami` → Not logged in · sem `EXPO_TOKEN` · `project:info` indisponível · Apple Developer **não confirmado**.

## Próximo passo do proprietário

```bash
cd apps/mobile
npx eas-cli@latest login
npx eas-cli@latest whoami
npx eas-cli@latest project:info
```

Não criar projeto EAS novo sem autorização. Não publicar na App Store. Não versionar IPA.
