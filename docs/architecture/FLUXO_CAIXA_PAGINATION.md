# Fluxo de Caixa — Paginação (Sprint 9.8.4)

Paginação server-side da **tabela de movimentações**, sem alterar regras financeiras, saldo, previsto/realizado, filtros, DRE ou Dashboard.

---

## Auditoria (antes)

| Item | Situação |
|------|----------|
| API | `FluxoCaixaService.getFluxo()` monolítico |
| Listagem | Array completo `itens[]` enviado à página |
| Paginação | Inexistente |
| Ordenação | Após merge: `data DESC`, `descricao` ASC (`pt-BR`) |
| Filtros | Período/conta/status no SQL; categoria/centro de movs em memória (join título) |
| SELECT | Projeções explícitas (`MOV_SELECT`, `CR_PREVISTO_SELECT`, `CP_PREVISTO_SELECT`) — sem `SELECT *` |
| Exportação na página | Não existia (Dashboard export usa `resumo`/`daily`, não `itens`) |
| Dashboard | Chamava `getFluxo` e descartava `itens` |

Fontes unidas: movimentações + CR previstos + CP previstos. Offset SQL único na união exigiria view/RPC (fora do escopo — sem migrations/RPCs).

---

## Depois

### Contrato

`FluxoCaixaListParams` estende filtros com:

- `page` / `perPage` — listagem (teto `FINANCEIRO_MAX_PER_PAGE`)
- `includeItens: false` — só agregados (Dashboard)
- `exportAll: true` — todos os itens filtrados (exportação futura / completa)

`FluxoCaixaResult.itens` → `PaginatedResult<FluxoCaixaLancamento>` com:

`data`, `total`, `page`, `perPage` (pageSize), `totalPages`, `hasNext`, `hasPrevious`

### O que NÃO é paginado

- `resumo` (saldo, previsto, realizado, projetado)
- `daily` (gráfico)
- Cálculo de saldo inicial

### UI

- `?page=` na URL
- `FinanceiroPagination`
- Filtros resetam `page`
- Estados: sucesso, vazio (`total === 0`), erro (try/catch na page)

### Performance (estrutural)

| | Antes | Depois |
|--|-------|--------|
| Payload da tabela | N lançamentos | `perPage` (default 10) |
| Dashboard | materializava + ordenava `itens` | `includeItens: false` |
| Consultas agregadas | iguais | iguais (filtros/saldos preservados) |

> A união ainda é montada no servidor para preservar totais e ordem. O ganho imediato é **payload RSC → browser** e custo no Dashboard.

---

## Exportação

Não há export na página do Fluxo hoje. Quando houver:

```ts
service.getFluxo({ ...filters, exportAll: true })
```

Nunca exportar apenas `itens.data` da página corrente.
