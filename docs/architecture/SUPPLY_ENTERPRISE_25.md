# Supply Chain Enterprise — Fase 25 / Sprint 25.1

Elevação de **Compras, Estoque e Cadeia de Suprimentos** sem duplicar bases canônicas.

## Princípios

- Catálogo único: `lib/produtos` + `public.produtos`
- Movimentações: `lib/estoque` + `estoque_movimentacoes` (+ taxonomia enterprise)
- Fornecedores: Finance Core (`lib/financeiro/fornecedor-service` + `fornecedores`)
- KPIs de estoque reutilizam Analytics / executive-stock quando aplicável
- Financeiro de compras → Finance Core (`contas_pagar`) na integração **real** (Sprint 25.1)
- CRM apenas por ponte (clientes) — sem segunda base
- Multitenant via `requireTenant` + RBAC `estoque.*` / `compras.*`
- Multiempresa / multifilial: `empresa_id` / `filial_id` (UUIDs lógicos)
- IA determinística (`SUPPLY_EXTERNAL_AI_ENABLED=0` por padrão)

## Sprint 25.1 — Correções

- Cadastro de produtos com campos enterprise (NCM, CEST, dimensões, segurança, controles)
- Eliminado falso sucesso em `integrado`: estoque + AP via Finance Core **antes** do stamp
- Idempotência AP por `contas_pagar.compra_pedido_id`
- UI mínima de pedidos (criar rascunho + avançar workflow)
- RBAC por transição (`aprovar` / `receber` / `cancelar`)
- Migration ampliada: recebimentos, cotação itens, reservas, FKs, uniques

## Custo médio

Metodologia: média ponderada móvel (`AVERAGE_COST_METHODOLOGY`).  
Entrada com custo unitário atualiza; saída/transferência/reserva não recalculam; sem custo → indisponível (não inventar).

## Sprint 25.2 — Pós-migration

Migration `20260813` aplicada manualmente no Supabase.
Validação runtime: tabelas Enterprise acessíveis; tipos locais alinhados
(`compras_recebimentos`, `estoque_reservas`, `compras_cotacao_itens`).

## Flags

- `SUPPLY_ENTERPRISE_ENABLED` (default on)
- `SUPPLY_EXTERNAL_AI_ENABLED` (default off)
- `SUPPLY_EXTERNAL_INTEGRATIONS_ENABLED` (default off)

## Testes

```bash
npm run test:supply-core
npm run test:inventory-core
npm run test:purchase-core
npm run test:supply-experience
npm run test:supply-corrections
```

## Limitações restantes

- UI completa de cotação lado a lado / anexos ainda básica
- Lote/série/validade: flags no produto; ledger completo “em preparação”
- Empresa/filial sem tabelas first-class — UUIDs lógicos + allow-list
- AP exige classificação financeira no fornecedor (categoria/centro/plano)
- Comparação de cotações e ranking OTIF dependem de histórico canônico
- Contagem item-a-item de inventário / recontagem detalhada: modelo + ciclo; UI de itens ainda enxuta
- Recebimento parcial via workflow de status; tabela `compras_recebimentos` pronta pós-migration
