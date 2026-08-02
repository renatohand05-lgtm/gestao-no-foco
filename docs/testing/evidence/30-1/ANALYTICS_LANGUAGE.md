# Sprint 30.1 — Analytics Language

## Objetivo
Reduzir linguagem técnica na face do Analytics sem remover auditoria.

## Implementação
`lib/analytics/friendly-labels.ts` + uso em `executive-analytics-dashboard.tsx`

| Antes | Depois |
|-------|--------|
| `lib/finance/cash-intelligence` | Financeiro — Caixa |
| `source empty` | Sem dados disponíveis para o período |
| `confidence medium` | Confiança moderada |
| `key: status` cru no badge | rótulo amigável; path técnico no `title` |

## Escopo
Ajuste de linguagem — **sem redesenho** do Analytics.

## Testes
`test:phase30-analytics-language` · 6 PASS  
Browser: face sem `lib/finance/cash-intelligence`  
