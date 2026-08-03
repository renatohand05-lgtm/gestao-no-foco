# Sprint 30.5 — Follow-up Premium

## Superfície

- Rota: `/{tenant}/crm/follow-ups`
- UI: `components/crm/premium/follow-up-panel.tsx`
- Buckets: `lib/crm/premium/follow-up-buckets.ts`

## Buckets

Atrasados, hoje, amanhã, esta semana, sem responsável, sem data.

## Ações

- Concluir (`updateClienteTarefaStatusAction`)
- Adiar +1d / atribuir (`patchClienteTarefaAction`)
- Abrir cliente / oportunidades

## Testes

- `npm run test:phase30-followup` — 8 PASS / 0 FAIL
