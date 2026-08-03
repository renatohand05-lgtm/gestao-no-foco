# Sprint 31.0 — QA Matrix

| Cenário | Ambiente | Resultado |
|---------|----------|-----------|
| Estrutura / rotas / contratos | Node suites | PASS (101) |
| mobile:typecheck | Windows | PASS |
| mobile:lint | Windows | PASS |
| mobile:test | Windows | PASS |
| mobile:doctor | Windows | 19/20 (ressalva react dup) |
| Web lint/build/RC/rbac | Windows | PASS |
| Expo Dev Client / Android emulator | — | NÃO executado (sem emulador nesta sessão) |
| Dispositivo Android físico | — | NÃO |
| iOS Simulator | Windows | N/A — preparado via EAS/config estática |
| EAS cloud build | — | NÃO (restrito) |

## Telas validadas estaticamente

splash/boot, login, tenant, branch, home shell, profile, settings, offline, access-denied, not-found

## iOS readiness

Config: `bundleIdentifier com.gestaonofoco.app`, scheme `gof`, eas.json profiles.
**Homologação iOS:** PARCIAL (sem Mac/simulador/EAS run nesta sprint).
