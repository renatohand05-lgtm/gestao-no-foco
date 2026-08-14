# Sprint 34.9 — Contas a Pagar: Beneficiários + despesas rápidas

**Data:** 2026-08-14  
**Branch:** `main`  
**Tipo:** UX/modelo Contas a Pagar — sem billing / Asaas / 33.11 / auto-migration prod  
**34.8:** GO (beta controlado aguarda homologação desta melhoria)

## Status

**SPRINT 34.9: GO (código)** — migrations production **PENDING** · homologação manual **PENDING**

### Correção de homologação — forma de pagamento

**NO-GO manual** identificado: select mostrava só `CREDITO` / `DEBITO` / `DINHEIRO` / `PIX`.

#### CAUSA RAIZ

O select de Nova conta **não** usa enum hardcoded. A fonte real é:

`nova/page.tsx` → `ContaPagarService.listFormasPagamento()` → tabela `formas_pagamento` (tenant).

A sugestão contextual só **reordena** linhas existentes. Em production o tenant só tinha 4 formas legadas em caixa alta — por isso Boleto / Transferência / Débito automático / Depósito **não apareciam**. Testes anteriores validavam ranking puro, não a fonte real do catálogo.

#### Correção

1. Catálogo mínimo CAP (`lib/financeiro/formas-pagamento-catalog.ts`)
2. `ensureContasPagarFormasCatalog()` no `listFormasPagamento` (idempotente; não apaga legado)
3. Labels amigáveis via `formatFormaPagamentoLabel` (CREDITO → Cartão de crédito, etc.)
4. Migration aditiva `20260828_phase34_9_formas_pagamento_catalog.sql` para backfill de todos os tenants

## Decisão arquitetural

| Opção | Decisão |
|---|---|
| Empurrar mecânicos/equipe em `fornecedores` | **Não** |
| `financeiro_beneficiarios` + tipagem em CAP | **Sim** |
| Preservar `fornecedor_id` + `fornecedor_nome` | **Sim** |
| Hardcode de formas no select | **Não** — tabela `formas_pagamento` |
| Completar catálogo faltante | **Sim** (ensure + migration) |

### Forma de pagamento contextual

Preset **sugere**; usuário altera. Sem acoplar à DRE.

## Migrations

1. `supabase/migrations/20260827_phase34_9_contas_pagar_beneficiarios.sql` — beneficiários
2. `supabase/migrations/20260828_phase34_9_formas_pagamento_catalog.sql` — catálogo formas

**PRODUCTION: NÃO EXECUTADAS automaticamente** — Renato aplica após revisão.

## Testes

`npm run test:phase34-9-contas-pagar-beneficiarios`
Inclui prova da fonte real do select + catálogo a partir do legado CREDITO/DEBITO/DINHEIRO/PIX.

## Homologação manual (após migrations)

1. Nova conta → select deve listar Transferência, Boleto, Débito automático, Depósito (além das legadas com label amigável)
2. Salários → prioriza PIX / Transferência
3. Energia → prioriza Boleto / PIX / Débito automático
4. Alterar forma manualmente e salvar
5. Demais itens do smoke 34.9 (beneficiário, tenant, mobile)

## Billing

**FROZEN SAFE** · Cliente beta: **NO-GO** até homologar 34.9 · Cliente pago: **NO-GO**

## Próxima ação

Renato: aplicar **as duas** migrations 34.9 em production (se 20260827 ainda não); abrir Nova conta e validar o select completo + sugestão por preset.
