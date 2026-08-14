# Sprint 34.7 — Relatórios para piloto + integridade dos indicadores

**Data:** 2026-08-14  
**Branch:** `main`  
**Commit:** `660982c4fd42461bd95ae28df095477e07a32efe`  
**Tipo:** Honestidade de KPIs/relatórios essenciais — sem BI completo / billing / Asaas / 34.8  
**34.6:** GO

## Status técnico

**SPRINT 34.7: GO (código + testes)** — homologação manual PENDING

| Critério | Status |
|---|---|
| REPORT INVENTORY | **PASS** |
| SOURCE OF TRUTH | **PASS** |
| SALES REPORT | **PASS** |
| FINANCE REPORT | **PASS** (aging paginado; CR/CP/DRE existentes) |
| INVENTORY REPORT | **PASS** (posição/ABC/reposição tenant-scoped) |
| CUSTOMER REPORT | **PARTIAL** (total via dashboard; “novos no período” N/A se UI não expõe) |
| OS REPORT | **PARTIAL** (módulo Ordens + analytics alias; sem relatório OS dedicado novo) |
| DASHBOARD CONSISTENCY | **PASS** (gráfico diário alinhado a `total` líquido) |
| TENANT ISOLATION | **PASS** (contratos + guards existentes 34.2) |
| CROSS-TENANT | **PASS** (sanitize filtros; queries `.eq(tenant_id)`) |
| INACTIVE | **PASS** (hardening 34.2 preservado) |
| RBAC | **PASS** |
| FILTERS | **PASS** (analytics em `America/Sao_Paulo`; invertido corrigido) |
| EXPORT | **PASS** (CSV; Excel/PDF analytics = N/A flags OFF) |
| CSV SAFETY | **PASS** |
| DATA HONESTY | **PASS** |
| PERFORMANCE | **PARTIAL** (aging até 2k títulos; ABC/repos limit 500) |
| P0 REGRESSION | **PASS** (suite) |
| Billing | **FROZEN SAFE** |

## 1. Inventário

| Item | Rota / superfície | Fonte | Tenant | Filtros | Export | Permissão | Status |
|---|---|---|---|---|---|---|---|
| Dashboard executivo | `/{t}/dashboard` | `vendas` (faturado/`total`), CR avulsas, financeiro, clientes | `tenant_id` + membership | período dashboard | CSV/XLS/print | dashboard.* | **REAL** |
| Hub Relatórios | `/{t}/relatorios` | links para módulos reais | requireTenant | N/A | N/A | auth tenant | **REAL** (hub) |
| Analytics Executivo | `/{t}/analytics` | orchestrator / domains | tenant + sanitize | presets período | CSV (`analytics.exportar`) | analytics.* | **REAL** |
| Analytics domínio (vendas/fin/estoque/…) | `/{t}/analytics/*` | **mesmo bundle** executivo | idem | idem | idem | analytics.* | **PARTIAL** (alias honesto) |
| Analytics relatórios UI | `/{t}/analytics/relatorios` | CSV flags; Excel/PDF OFF | idem | — | CSV | exportar | **PARTIAL** / Excel-PDF **N/A** |
| Aging CR | `/{t}/financeiro/aging` | `contas_receber` aberto/vencido | service tenant | data ref SP | N/A | financeiro.aging / visualizar | **REAL** (corrigido) |
| Financeiro listagens / DRE / fluxo | `/{t}/financeiro/*` | serviços financeiro | tenant | UI existente | conforme módulo | financeiro.* | **REAL** |
| Estoque dashboard / ABC / reposição | `/{t}/estoque/*` | `produtos` (+ movs no módulo) | `tenant_id` | limit 500 ABC | N/A | estoque.* | **REAL** |
| Vendas operacional | `/{t}/vendas` | vendas | tenant | UI | drawer CSV | vendas.* | **REAL** |
| OS | `/{t}/ordens` | OS | tenant | UI | N/A | os.* | **REAL** (ops) |
| Metas / painel comercial export | painel comercial | metas + faturamento | tenant | competência | CSV hardened | metas/comercial | **REAL** |
| Demo / seed KPI | — | — | — | — | — | — | **DEAD** / removido em 34.5 |

## 2. Source of truth — regras

### Vendas / faturamento (`lib/dashboard/faturamento-agregacao.ts`)

- Inclui apenas `status === "faturado"` e `deleted_at IS NULL`.
- Valor de KPI: **líquido** (`total`), não bruto (`subtotal`).
- Cancelado / orçamento / em_andamento: **fora**.
- CR avulsa (`venda_id IS NULL`, status ≠ cancelado): soma `valor_original` por competência.
- OS faturada: entra via venda gerada (não soma OS + venda).

### Financeiro

- Aging: saldo pendente de títulos `aberto`/`vencido`; buckets por vencimento vs data civil SP.
- `getResumo` CR: todos os não-cancelados do tenant (sem cap de página).
- Cancelados não entram em aberto/vencido.

### Estoque

- Posição: `produtos.estoque_atual` do tenant.
- ABC: valor = qtd × custo (fallback preço); sem curva inventada.
- Reposição: comparado a mínimo/máximo cadastrado.

### Timezone

- Padrão produto: **`America/Sao_Paulo`** (`DEFAULT_TENANT_TIMEZONE`).
- Analytics `resolvePeriodPreset` alinhado ao dashboard (não UTC “hoje”).
- Limitação: tenant sem TZ custom em config continua no padrão BR.

## 3. Correções nesta sprint

1. **Aging** — paginação completa (até 40×50) em vez de 1ª página (totais errados).
2. **Faturamento diário** — `select/sum` de `total` (líquido), alinhado ao KPI.
3. **CSV** — `csvEscapeCell` em dashboard export, commercial export e drawer do resumo do dia.
4. **Filtros analytics** — fuso SP + swap de período custom invertido.
5. **Hub `/relatorios`** — links honestos + copy sem mock.
6. **Analytics domínio** — descrições explícitas de alias do núcleo executivo.
7. **Erros ABC/reposição** — mapping 34.6 (sem message Supabase cru).

## 4. Reconciliações (cenário controlado / unitário)

### Vendas

| Caso | Esperado | Obtido (suite) |
|---|---|---|
| 1 venda faturada 90 + CR avulsa 30; cancelada 500 ignorada | líquido 120; qtd 1 | **PASS** |
| Soft-deleted faturada | excluída | **PASS** |
| Gráfico diário usa `total` | contrato código | **PASS** |

Homologação prod: somar vendas faturadas do período no módulo Vendas e comparar ao KPI Faturamento do Dashboard.

### Financeiro

| Caso | Esperado | Suite |
|---|---|---|
| Aging buckets a_vencer + vencido | totais 100 + 50 | **PASS** |
| >50 títulos abertos | páginas iteradas | **PASS** (contrato) |

### Estoque

| Caso | Esperado |
|---|---|
| Tenant A produto X | só aparece em A |
| Empresa nova | empty / zeros reais, sem demo |

## 5. Tenant / RBAC / export

- Queries reportam `.eq("tenant_id", …)` / services por tenant.
- `sanitizeMetricFilter` descarta `empresaIds` sem allow-list server.
- `exportAnalyticsCsv` exige `analytics.exportar` (compat dashboard/relatorios.exportar).
- Inactive membership: preservado 34.2 (não reaberto).

## 6. Empty / loading / error

- Analytics shared: Suspense skeleton + `role="alert"` em erro de action.
- Relatórios sem dados: empty states dos módulos (não seed).
- ABC/repos: erro amigável.

## 7. Performance / limites

- Aging: hard cap 2000 títulos + aviso se truncado.
- ABC/repos: `limit(500)`.
- Sem N+1 novo introduzido no aging (loop de páginas do list existente).

## 8. Testes

```text
npm run test:phase34-7-reports-integrity
(+ regressões 34.2–34.6, test:rbac, lint, typecheck, build)
```

## 9. Migration

**NENHUMA**

## 10. Homologação manual (Renato) — checklist curto

1. **Dashboard** — período atual: faturamento = soma vendas faturadas (líquido) + CR avulsas do período.
2. **Vendas** — cancelada não entra no faturamento.
3. **Financeiro / Aging** — totais batem com lista abertos/vencidos (não só 1ª página).
4. **Estoque dashboard** — posição coerente com produtos; tenant B diferente.
5. **Troca de empresa** — KPIs mudam; sem vazamento.
6. **Mobile web** — filtros/cards utilizáveis no dashboard e aging.
7. **CSV** (se exportar) — cliente com nome `=TEST` não vira fórmula no Excel.

**HOMOLOGAÇÃO MANUAL: PENDING**

## 11. Riscos restantes (não P0)

- Analytics domínio ainda é alias (não relatório especializado) — documentado.
- PITR / monitoring externo: herdados 34.6 PARTIAL.
- `ASAAS_PRODUCTION_API_KEY_BLOCKER` externo.
- Cap aging 2k / ABC 500 em bases muito grandes.

## 12. Próxima ação

Renato: smoke da checklist acima em production (após deploy deste commit).

**Não iniciar 34.8 automaticamente.**
