# Sprint 31.11.1 — IOS_BUILD

## Status

**Build iOS: NÃO EXECUTADO** (bloqueio de autenticação EAS)

## Profiles (eas.json)

| Profile | Uso iOS | Distribution |
|---------|---------|--------------|
| development | Dev client / simulator | internal |
| preview | Internal preview | internal |
| **internal** | **Instalação ad-hoc no iPhone** | **internal** |
| production | Candidato TestFlight | store (via submit separado) |

Caminho A (iPhone direto): `eas build --platform ios --profile internal`
Caminho B (TestFlight): `eas build --platform ios --profile production` → submit **só com autorização**

## Bundle / versão

- bundleIdentifier: `com.gestaonofoco.app`
- version: `1.10.0`
- buildNumber: `110`
- runtimeVersion: policy `appVersion`

## Após autenticação (ordem sugerida)

1. `eas whoami` / `project:info`
2. Confirmar Apple Developer
3. Caminho A: `eas device:create` → registrar iPhone → `eas device:list` (não publicar UDID)
4. Build **sem** `--non-interactive` no primeiro fluxo de credenciais
5. Não executar `eas submit` nesta sprint sem autorização explícita

## Artefato

IPA: **não gerado** nesta sessão. Não versionar IPA.
