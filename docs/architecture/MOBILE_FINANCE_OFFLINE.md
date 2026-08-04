# Mobile Finance Offline

## Escopo (31.3)

Somente leitura do último snapshot de **summary** (KPIs formatados, alertas, quick actions).

## Armazenamento

- AsyncStorage key: `@gof/cache/finance-summary/{tenantId}`
- Sem tokens, sem service role, sem IDs sensíveis extras

## UX

- Banner: “Offline há N min (pode estar desatualizado)”
- Sem dados → empty state pedindo conexão

## Bloqueado offline

Aprovar, reprovar, criar, editar, pagar, receber, excluir, baixar, conciliar, transferir, anexar.

## Não nesta sprint

Fila de mutação financeira offline.
