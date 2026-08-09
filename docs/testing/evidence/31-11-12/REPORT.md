# Sprint 31.11.12 — Zero pendências / hardening final

## Classificação

**APROVADA COM RESSALVAS**

Ressalva residual de processo: homologação física no iPhone (não é dívida de código).  
Archive EAS reduzido **345 MB → 166 MB** (ainda pode ser otimizado em sprint futura; não bloqueia).

---

## Correções aplicadas

| Item | Ação |
|------|------|
| `app.json` raiz vazio | Removido; `/app.json` no `.gitignore` |
| `ios.buildNumber` warning | Removido; fonte oficial = EAS remote |
| Archive EAS | `.easignore` na **raiz do monorepo** (paths em `apps/mobile/.easignore` não excluem pais) |
| Versionamento | Marketing `1.10.0` + `runtimeVersion.policy=appVersion`; iOS build # remoto |

### Fonte oficial de versionamento

1. **Marketing / runtime:** `apps/mobile/app.config.ts` → `version` + `runtimeVersion.policy = "appVersion"`
2. **iOS build number:** EAS remote (`eas.json` → `cli.appVersionSource: "remote"`)
3. **Android versionCode:** `ANDROID_VERSION_CODE` em `app.config.ts`

---

## Checklist final

| # | Item | Resultado |
|---|------|-----------|
| 1 | git limpo | **SIM** |
| 2 | app.json pendente resolvido | **SIM** |
| 3 | Expo config sem inconsistência | **SIM** |
| 4 | warning ios.buildNumber resolvido | **SIM** |
| 5 | archive EAS otimizado | **SIM** (redução significativa) |
| 6 | tamanho anterior | **345 MB** |
| 7 | tamanho novo | **166 MB** |
| 8 | Expo Doctor 20/20 | **SIM** |
| 9 | lint 0 erros | **SIM** |
| 10 | typecheck PASS | **SIM** |
| 11 | testes 0 FAIL | **SIM** |
| 12 | export iOS PASS | **SIM** |
| 13 | auth PASS | **SIM** (suites estáticas) |
| 14 | Face ID PASS estático | **SIM** |
| 15 | Supabase PASS | **SIM** (clients + env; chave não impressa) |
| 16 | API mobile PASS | **SIM** (401 sem token) |
| 17 | RBAC Web/Mobile PASS | **SIM** (parity 17/0) |
| 18 | tenant isolation PASS | **SIM** |
| 19 | offline recovery PASS | **SIM** |
| 20 | segurança PASS | **SIM** (sem service_role no mobile) |
| 21 | Vercel Ready | **SIM** |
| 22 | smoke produção PASS | **SIM** |
| 23 | commit SHA | `2b2b15f` (easignore root); hardening `0f5a90f` |
| 24 | push sincronizado | **SIM** |
| 25 | build iOS nova | **SIM** |
| 26 | Build ID | `5e8f4169-3a9f-434d-869e-b65e0ccc5d37` |
| 27 | Build URL | https://expo.dev/accounts/gesto-no-foco/projects/gestao-no-foco/builds/5e8f4169-3a9f-434d-869e-b65e0ccc5d37 |
| 28 | pronto para homologação iPhone | **SIM** |
| 29 | erros técnicos conhecidos restantes | Nenhum detectado nos gates |
| 30 | warnings conhecidos restantes | Node `MODULE_TYPELESS_PACKAGE_JSON` nos unit tests (informativo); archive ainda 166 MB |
| 31 | blockers restantes | Homologação física no dispositivo |
| 32 | pronto para TestFlight após homologação | **SIM** |

---

## Gates executados

- `mobile:doctor` 20/20  
- `mobile:lint` / `typecheck` / `test` PASS  
- Suites auth/session/biometrics/recovery/boot/post-login/offline/logout/tenant/branch/rbac/guards/dashboard/intelligence/finance/CRM/stock/operations/parity/ios-build/RC/homolog PASS  
- `expo export --platform ios --clear` PASS  
- Smoke: `/` `/login` `/api/health` `/api/status` OK; memberships **401**  
- App Store / TestFlight: **não** submetido  

---

## Build iOS

- Projeto: `@gesto-no-foco/gestao-no-foco`  
- Bundle: `com.gestaonofoco.app`  
- Credenciais: reutilizadas (sem gerar novas)  
- Status: **finished**  
