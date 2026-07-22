# Sprint 15 — Métricas e fórmulas

Fonte canônica no código: `lib/operacoes/metricas.ts` (`METRICAS_DEFINICOES`).

## Ordens de serviço

| Indicador | Fórmula |
|-----------|---------|
| OS aberta | Status não terminal (≠ entregue, faturado, cancelado) |
| OS pendente | aguardando_aprovacao / peça / cliente / orçamento |
| OS atrasada | Aberta com `previsao_entrega` &lt; hoje |
| Ticket médio OS | Σ valor_total OS faturadas ÷ qtd faturadas |
| Taxa de aprovação | Aprox. OS que avançaram após aprovação ÷ candidatas |
| Retrabalho | OS `retorno` ÷ OS finalizadas |
| Retorno/garantia | Status `retorno` ou `garantia` |

## Vendas

| Indicador | Fórmula |
|-----------|---------|
| Venda válida | `status = faturado` e `deleted_at` nulo |
| Ticket médio | Σ total válidas ÷ qtd válidas |
| Margem bruta | Σ `margem_total` das vendas faturadas |

## Estoque

| Indicador | Fórmula |
|-----------|---------|
| Baixo | `0 < estoque_atual ≤ estoque_minimo` (mínimo &gt; 0) |
| Zerado | `estoque_atual ≤ 0` |
| Sem giro | Sem movimentação em 90 dias |
| Valor | Σ estoque × (custo ou preço) |

## Recursos

| Indicador | Fórmula |
|-----------|---------|
| Taxa de ocupação | (ocupado + reservado) ÷ recursos ativos |

## Mecânicos (Gate 2)

| Indicador | Fórmula |
|-----------|---------|
| Horas estimadas | Σ `ordem_servico_itens.horas_previstas` das OS do mecânico |
| Horas realizadas | Σ `ordem_servico_itens.horas_realizadas` |
| Produtividade | OS concluídas ÷ OS atribuídas |
| Eficiência | Horas realizadas ÷ horas estimadas |
| Ocupação | Horas realizadas ÷ (dias decorridos no mês × 8h) |
| Receita mão de obra | Σ valor de itens tipo serviço em OS do mecânico |

Se horas não forem preenchidas nos itens, os KPIs de hora/eficiência/ocupação ficam 0 ou "—".

Não usar nomes iguais com fórmulas diferentes entre dashboards.

