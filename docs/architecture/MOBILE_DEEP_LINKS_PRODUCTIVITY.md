# Mobile Deep Links (Produtividade)

Scheme: `gof://` (Expo `scheme: "gof"`).

Resolução: `resolveInternalDeepLink` com allowlist de paths internos (`/operacao`, `/crm`, `/estoque`, `/financeiro`, `/busca`, …).

Bloqueios: `http(s)`, `..`, `//`, rotas fora da allowlist.

Root layout só navega deep link interno se sessão autenticada (ou offline_limited). Auth reset continua prioridade.
