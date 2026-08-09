# Sprint 31.11.12 — Zero pendências / hardening final

## Classificação

**APROVADA COM RESSALVAS**

Ressalva residual: homologação física no iPhone (processo, não dívida de código). Archive EAS medido na build desta sprint.

---

## Correções aplicadas

| Item | Ação |
|------|------|
| `app.json` raiz vazio | Removido; `/app.json` no `.gitignore` |
| `ios.buildNumber` warning | Removido; fonte oficial = EAS remote (`appVersionSource: remote`) |
| Archive EAS ~345 MB | `.easignore` exclui `.next-build*`, `docs/`, `app/`, `scripts/`, caches, logs, `apps/mobile/test/` |
| Versionamento | Marketing `1.10.0` + `runtimeVersion.policy=appVersion`; iOS build number remoto |

## Fonte oficial de versionamento

1. **Marketing / runtime:** `apps/mobile/app.config.ts` → `version` + `runtimeVersion.policy = "appVersion"`
2. **iOS build number:** EAS remote (`eas.json` → `cli.appVersionSource: "remote"`)
3. **Android versionCode:** `ANDROID_VERSION_CODE` em `app.config.ts`

---

## Checklist (preenchimento final pós-build)

Ver seção final abaixo após commit / deploy / build.
