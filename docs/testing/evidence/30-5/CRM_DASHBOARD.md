# Sprint 30.5 — CRM Dashboard Premium

## Superfície

- Rota: `/{tenant}/crm/executivo`
- Compose: `lib/crm/premium/compose-dashboard.ts` (`React.cache`)
- UI: `components/crm/premium/crm-premium-dashboard.tsx`

## KPIs (dados reais)

- Total de oportunidades
- Valor total do pipeline
- Receita prevista / provável / fechada (mês)
- Taxa de conversão
- Ticket médio
- Tempo médio de fechamento
- Follow-ups pendentes
- Oportunidades paradas
- Clientes sem contato
- Comparação MoM (ou “Sem base no período”)

## Painéis

- Previsão de receita (funil ponderado)
- Motivos de perda (categorias)
- Clientes em risco
- Ranking de responsáveis

## Testes

- `npm run test:phase30-crm-dashboard` — 23 PASS / 0 FAIL
