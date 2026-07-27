# Finance Aggregates — Fase 22

**Sprint:** 22.0 (design)  
**Regra:** um Aggregate = boundary de consistência + invariantes. Repositórios carregam/salvam o aggregate inteiro (ou fatias versionadas).

---

## 1. Visão geral

| Aggregate | Root | Bounded Context |
|-----------|------|-----------------|
| `BankAccountAggregate` | `BankAccount` | Treasury |
| `CashFlowAggregate` | `CashFlowSnapshot` (period) | Cash Flow |
| `PayablesAggregate` | `Payable` | Payables |
| `ReceivablesAggregate` | `Receivable` | Receivables |
| `ChartOfAccountsAggregate` | `ChartOfAccounts` | Classification |
| `ReconciliationAggregate` | `ReconciliationSession` | Reconciliation |
| `BudgetAggregate` | `Budget` | Budgeting |
| `DailyClosingAggregate` | `DailyClosing` | Closing |
| `ForecastAggregate` | `ForecastScenario` | Forecasting |
| `TransferAggregate` | `Transfer` | Treasury |

---

## 2. Detalhamento

### 2.1 `BankAccountAggregate`

**Root:** `BankAccount`  
**Children:** saldos calculados, preferências de caixa, vínculo opcional `CashRegister`

**Invariantes**
- `tenantId` imutável após criação
- Conta soft-deleted não aceita novos movimentos
- Moeda única por conta (BRL v1)

**Comandos:** `open`, `updateMetadata`, `deactivate`, `reactivate`

---

### 2.2 `TransferAggregate`

**Root:** `Transfer`  
**Children:** `BankMovement` (débito) + `BankMovement` (crédito)

**Invariantes**
- Contas origem ≠ destino
- Mesmo `tenantId` e mesma moeda
- Valores absolutos iguais
- Criação atômica (tudo ou nada)

**Comandos:** `execute`, `reverse` (estorno em par)

---

### 2.3 `PayablesAggregate`

**Root:** `Payable`  
**Children:** `Settlement[]`, `Allocation[]`, `Installment` (se plano)

**Invariantes**
- Soma das baixas ≤ valor do título
- Status derivado: `open | partial | paid | cancelled`
- Rateios somam 100% quando presentes
- Título cancelado não recebe baixas

**Comandos:** `create`, `update`, `allocate`, `settle`, `cancel`, `duplicate`, `scheduleInstallments`

---

### 2.4 `ReceivablesAggregate`

**Root:** `Receivable`  
**Children:** `Settlement[]`, `Allocation[]`

**Invariantes**
- Análogos a Payables
- Vínculo opcional a `DocumentRef` (venda/OS) único quando aplicável

**Comandos:** `create`, `update`, `settle`, `cancel`, `duplicate`

---

### 2.5 `CashFlowAggregate`

**Root:** período (`Period`) + `tenantId`  
**Children:** pontos diários (realizado/previsto), saldos por conta

**Invariantes**
- Read-mostly; mutações vêm de outros aggregates
- `saldoPrevisto` = saldo + entradas previstas − saídas previstas

**Comandos (queries):** `project`, `refreshSnapshot`

---

### 2.6 `ReconciliationAggregate`

**Root:** `ReconciliationSession`  
**Children:** `BankStatementLine[]`, `ReconciliationMatch[]`

**Invariantes**
- Match 1:1 ou N:1 documentado
- Não altera valor do `BankMovement`
- Sessão fechada é imutável (exceto reopen com permissão)

**Comandos:** `importStatement`, `match`, `unmatch`, `closeSession`

---

### 2.7 `BudgetAggregate`

**Root:** `Budget`  
**Children:** `BudgetLine[]`

**Invariantes**
- Período contínuo único
- Linhas sem overlap conflitante na mesma dimensão
- Status: `draft | submitted | approved | locked`

**Comandos:** `draft`, `submit`, `approve` (via Approval Runtime), `lock`, `revise`

---

### 2.8 `DailyClosingAggregate`

**Root:** `DailyClosing`  
**Children:** totais por conta/caixa, divergências

**Invariantes**
- Um fechamento por (`tenantId`, `date`, `cashRegister|bankAccount`)
- Dia fechado bloqueia edits de movimentos do escopo
- Reopen exige RBAC + Audit

**Comandos:** `closeDay`, `reopenDay`

---

### 2.9 `ForecastAggregate`

**Root:** `ForecastScenario`  
**Children:** `ForecastPoint[]`

**Invariantes**
- Cenário nomeado (`base | otimista | pessimista`)
- Pontos ordenados por data
- Não sobrescreve movimentos reais

**Comandos:** `generate`, `adjustManual`, `publish`

---

### 2.10 `ChartOfAccountsAggregate`

**Root:** árvore do tenant  
**Children:** `AccountNode[]`

**Invariantes**
- Códigos únicos por tenant
- Sem ciclos na hierarquia
- Soft-delete não remove histórico de lançamentos

---

## 3. Transações entre aggregates

| Caso | Estratégia |
|------|------------|
| Baixa CR/CP → movimento | Saga local / RPC atômica (já usada) |
| Transferência | Unit of work única |
| Close day | Lock otimista + flag `closed` |
| Budget approve | Approval Runtime → status `approved` |

Evitar distributed transactions cross-tenant.
