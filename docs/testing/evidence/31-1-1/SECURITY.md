# Sprint 31.1.1 — SECURITY

## Revisão estática

| Controle | Status |
|----------|--------|
| Tokens em SecureStore | Sim |
| Sem service role no mobile | Sim |
| API Bearer + `getUser()` server-side | Sim |
| Deep links allowlisted | Sim |
| Recovery sem enumeração (mensagem neutra) | Sim |
| `.env` real não versionado | Sim |
| Logs sanitizados (contratos) | Sim |

## Runtime Android (Logcat / Metro / network)

**Não executado** — sem emulador/device.

## Não alegar

- SSL pinning ativo
- Root detection ativo
- Screenshot protection ativo

Ver `docs/security/MOBILE_THREAT_MODEL.md`.
