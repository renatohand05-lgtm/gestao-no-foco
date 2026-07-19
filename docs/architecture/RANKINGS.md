# Rankings — Sprint 9.8.2

Otimização de leitura PostgREST sem alterar critérios nem resultados agregados.

---

## Auditoria

| Ranking | Origem | Filtros | Agregação | Top N | Risco antes |
|---------|--------|---------|-----------|-------|-------------|
| Top clientes | `vendas` + `clientes` | tenant, deleted_at null, status faturado, período `data_venda`, categoria/centro | soma `total` por `cliente_id` (app) | 5 | 1 scan vendas só para este ranking |
| Top produtos | `venda_itens` via vendas faturadas | idem + `tipo_item=produto` | soma `total` por produto/descrição | 5 | 2 queries (ids + IN amplo); lia todos os tipos |
| Top serviços | idem | `tipo_item=servico` | idem | 5 | idem |
| Top categorias | `vendas` + `contas_receber` avulsas | vendas faturadas; CR sem venda, ≠ cancelado, competência no período | soma totais por `categoria_financeira_id` | 5 | 2º scan vendas + CR sem filtro de categoria null |
| Mecânicos / motivos / serviços (QO) | `retornos_servico` | tenant, deleted_at, período `data_retorno` | contagem / taxa no app | 5 | select largo + embeds; evolução re-lia select completo |

---

## Otimizações aplicadas

### Dashboard (`fetchRankings`)

**Antes:** 5 round-trips (vendas×3 + itens + CR).  
**Depois:** 3 em paralelo (vendas×1 + itens `!inner` + CR).

| Mudança | Efeito |
|---------|--------|
| Uma query de vendas para clientes + categorias | −2 scans de vendas |
| `venda_itens` com `vendas!inner` + filtros no banco | −1 round-trip; sem `IN (ids)` |
| `.in("tipo_item", ["produto","servico"])` | Descarta kit/combo/mp no banco |
| CR `.not("categoria_financeira_id","is",null)` | Menos linhas sem categoria |
| Embeds só `nome` + FK explícita | Menos payload |
| Sem `limit` antes da soma | Resultado Top 5 inalterado |

### Qualidade operacional

| Mudança | Efeito |
|---------|--------|
| Select slim (sem `numero` / ids de embed ociosos) | Menor payload |
| `mecanico_id` + `servico_produto_id` no select | Rankings passam a usar FKs (regra correta) |
| `fetchRetornosEvolucao` sem embeds | Evolução mensal sem carregar drill-down |

---

## Não feito (exige RPC/view)

- `GROUP BY` / agregação SQL nativa no PostgREST
- Limit no banco após agregação
- Desempate alfabético/id (alteraria ordem em empates vs regra histórica só por valor)

---

## Validação esperada

Mesmos Top 5, mesmos valores e labels para o mesmo tenant/período (dashboard).  
Qualidade: se havia retornos com mecânico, rankings de mecânico podem **corrigir** colapso em `sem-mecanico` (select anterior omitia `mecanico_id`).
