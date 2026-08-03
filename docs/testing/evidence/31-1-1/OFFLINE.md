# Sprint 31.1.1 — OFFLINE

## Comportamento (31.1)

Modo `offline_limited` quando:

- sessão validada anteriormente;
- não expirada / não revogada;
- tenant/filial no cache autorizado.

Permitido: shell, perfil cache, settings locais, status offline.
Bloqueado: mutações financeiras, troca para tenant não validado, recovery, sync falsa.

## Homologação

| Item | Status |
|------|--------|
| Contratos / testes | PASS (`test:phase31-mobile-offline-limited`) |
| Toggle rede em Android | **Não** (sem device) |

**Offline limitado (código): SIM · device: NÃO**
