# Central de Importação — Catálogos, Produtos, Estoque e NF-e (Sprint 25.3)

Reutiliza **Enterprise Import Engine** (parsers, mapping, preview, history, rollback).
Não cria segunda engine.

## Catálogo de serviços

Arquivo: `data/catalogs/servicos-zona-sul-sp.xlsx` (~450 serviços).

- Premissas de hora técnica vêm da aba **Premissas** (editáveis no preview).
- Preços = tempo × hora técnica da faixa (ou valor explícito se preenchido).
- Não hardcodar preços como verdade universal.

## Entradas de UI

- `/{tenant}/produtos/importar` — download catálogo, faixa de preço, importação
- `/{tenant}/estoque/importar` — modelo produtos/estoque, preview Excel, XML NF-e

## Adapters Import Engine

- `catalog` → `servicos.importar`
- `stock` → `estoque.importar`
- `invoice` → `compras.receber` (ponte para `lib/nfe`)

## Persistência

- Serviços → `produtos` tipo `servico`, `controla_estoque=false`
- Produtos + saldo → `produtos` + `estoque_movimentacoes` (`origem=importacao_saldo_inicial`)
- NF-e → `NfeEntradaService` (fluxo existente); preview/histórico via Import Engine

## Testes

```bash
npm run test:catalog-import
npm run test:stock-import
npm run test:invoice-import
```

## Sprint 25.4 — Homologação

- Parser Excel escolhe aba `Importacao_*` (não `Resumo`) no arquivo de referência.
- UI: filtros categoria/complexidade, faixa personalizada, política de duplicidade.
- Validação server-side de hora técnica (bloqueia NaN/zero/Infinity).
- Download CSV do modelo de produtos.

## Limitações

- Wizard completo de mapping studio para estoque ainda enxuto (preview + commit API)
- Rollback de catálogo bloqueado se produtos já usados em OS/vendas
- Lote/série/validade na importação Excel: campos no modelo; ledger completo depende do Supply Core
