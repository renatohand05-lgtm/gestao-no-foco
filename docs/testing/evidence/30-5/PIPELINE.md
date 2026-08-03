# Sprint 30.5 — Pipeline Premium

## Superfície

- Rota: `/{tenant}/clientes/funil`
- Board: `components/crm/crm-funil-board.tsx`
- Service: `lib/crm/crm-funnel-service.ts`

## Cards

Valor, probabilidade, último contato, próxima ação, responsável, idade, tempo parado, prioridade, score comercial.

## Interações

- Drag and drop (`moveFunilStageAction`)
- Busca / filtros (responsável, prioridade, score mín.)
- Colapso de colunas
- Contagem + soma financeira por coluna

## Testes

- `npm run test:phase30-pipeline` — 16 PASS / 0 FAIL
