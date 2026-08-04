# Phase 31.3 — Financeiro Mobile

## Objetivo

Entregar o Financeiro Mobile em formato executivo/operacional enxuto, reutilizando services e fórmulas canônicas da web — sem duplicar lógica financeira.

## Arquitetura

```
Mobile App (Expo)
  └── fetchFinance* (Bearer)
        └── /api/mobile/v1/tenants/:tenantId/financeiro/*
              ├── authorizeFinanceRoute (Bearer + membership + RBAC)
              └── finance-compose.ts
                    ├── ContaPagarService
                    ├── ContaReceberService
                    ├── FluxoCaixaService
                    └── DreService
```

Service role, se usado, fica **somente no servidor** após auth.

## Rotas app

| Rota | Função |
|------|--------|
| `/financeiro` | Home + summary + alertas + quick actions |
| `/financeiro/contas-pagar` | Lista CAP |
| `/financeiro/contas-receber` | Lista CR |
| `/financeiro/fluxo-caixa` | Resumo + dias (lista) |
| `/financeiro/dre` | DRE resumido |
| `/financeiro/aprovacoes` | Painel honesto → web |
| `/financeiro/detalhe/[id]` | Detalhe pagar/receber |

## Aprovações

**PARCIAL:** runtime enterprise permanece em `/{tenant}/aprovacoes/runtime`. Mobile explica e abre a web. Sem mutação de aprovação no app nesta sprint.

## Offline

Snapshot somente leitura do **summary**. Mutações financeiras bloqueadas offline. Sem fila de mutação.

## Não alterado

Fórmulas DRE/caixa, conciliação, tributário, RBAC canônico, app web.
