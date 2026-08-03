# Sprint 31.1.1 — ANDROID_QA

## Resultado

**Android homologado: NÃO** (ambiente indisponível)

Validação estática / contratos: **PASS** (ver gates em REPORT).
QA em emulador/device: **não executado**.

## Matriz (planejada vs executada)

| Área | Em device | Status |
|------|-----------|--------|
| Boot / splash / rota | Não | Bloqueado |
| Login válido/inválido | Não | Bloqueado |
| Sessão / refresh / background | Não | Bloqueado |
| Tenant / filial | Não | Bloqueado |
| RBAC / access denied | Não | Bloqueado |
| Recovery deep link | Não | Bloqueado |
| Biometria | Não | Bloqueado |
| Offline limitado | Não | Bloqueado |
| Logout | Não | Bloqueado |
| Dark / light / teclado / safe area | Não | Bloqueado |

## Screenshots

Pasta `docs/testing/evidence/31-1-1/screenshots/` **não populada** — sem device/emulador.
Não foram inventadas capturas.

## Segurança em runtime Android

Logcat / Metro / network em device: **não auditados** (sem runtime).
Revisão estática: tokens em SecureStore; sem service role; deep links allowlisted — ver `SECURITY.md`.
