# Phase 31.10 — Mobile Release Candidate

Preparação Enterprise para distribuição **interna (RC)** sem gerar APK/AAB/IPA e sem publicar em lojas.

## Identidade

| Campo | Valor |
|-------|--------|
| Nome exibido | Gestão no Foco |
| Slug | `gestao-no-foco` |
| Scheme | `gof` |
| iOS bundle | `com.gestaonofoco.app` |
| Android package | `com.gestaonofoco.app` |
| Version | `1.10.0` |
| iOS buildNumber | `110` |
| Android versionCode | `110` |
| Tema | Gold Enterprise (`#C9A84C` / navy `#0B0F14`) |

Assets existentes reutilizados (`icon`, adaptive, monochrome, splash). Cores de fundo alinhadas à marca; sem artes fictícias geradas.

## EAS profiles (`eas.json`)

| Profile | Distribution | Channel | Android |
|---------|--------------|---------|---------|
| development | internal + dev client | development | apk |
| preview | internal | preview | apk |
| internal | internal | internal | apk |
| production | store-ready | production | app-bundle + autoIncrement |

Submit production preparado como **draft/internal track** — **não executado**.

## OTA / projectId

`runtimeVersion.policy = appVersion`.
`updates.url` e `extra.eas.projectId` só entram se `EAS_PROJECT_ID` estiver definido no ambiente de build (`eas init` pendente para 31.11).

## Permissões

Mantidas: câmera, biometria, internet, fotos (via image-picker).
Bloqueadas no Android: `RECORD_AUDIO`, storage legado.
Push nativo: dependência presente, **plugin não habilitado** (sem uso no código).

## Princípios

- Sem novas features
- Sem mudança de regras/APIs/Web
- Sem EAS Build/Submit
- Sem lojas
- Manifesto: `apps/mobile/src/release/manifest.ts`
