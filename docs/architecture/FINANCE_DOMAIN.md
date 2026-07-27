# Finance Domain Model — Fase 22

**Sprint:** 22.0 (design)  
**Base existente:** `lib/financeiro/`, `types/financeiro.ts`, CR/CP, DRE, Fluxo, Movimentações

---

## 1. Entidades (domínio canônico)

### 1.1 Cadastros / classificação

| Entidade | Descrição | Estado atual |
|----------|-----------|--------------|
| `ChartOfAccounts` (Plano de Contas) | Árvore contábil/gerencial | Existe |
| `AccountNode` | Nó do plano (código, tipo, DRE line) | Existe |
| `CostCenter` (Centro de Custo) | Dimensão gerencial | Existe |
| `FinanceCategory` / `Subcategory` | Classificação operacional | Existe (categoria); subcategoria = extensão |
| `PaymentMethod` | Forma de pagamento | Existe |
| `Supplier` / `Customer` | Partes (fornecedor/cliente) | Existe / CRM |

### 1.2 Tesouraria

| Entidade | Descrição | Estado atual |
|----------|-----------|--------------|
| `BankAccount` | Conta bancária / caixa | Existe |
| `CashRegister` (Caixa) | Ponto de caixa operacional (loja/oficina) | **Novo (design)** |
| `BankMovement` | Movimentação (entrada/saída/ajuste) | Existe |
| `Transfer` | Transferência entre contas (par de movimentos) | Backend parcial |
| `BankStatementLine` | Linha de extrato importado | **Novo** |
| `ReconciliationMatch` | Match extrato ↔ movimento | **Novo** |
| `ReconciliationSession` | Sessão de conciliação | **Novo** |

### 1.3 Obrigações e direitos

| Entidade | Descrição | Estado atual |
|----------|-----------|--------------|
| `Payable` (Conta a Pagar) | Título a pagar | Existe |
| `Receivable` (Conta a Receber) | Título a receber | Existe |
| `Settlement` (Baixa) | Liquidação parcial/total | Existe (baixas) |
| `Allocation` (Rateio) | Rateio por centro/plano | Existe (CP) |
| `InstallmentPlan` (Parcelamento) | Plano de parcelas | Extensão formal |
| `RecurringExpense` | Template de recorrência | Existe |
| `RecurrenceSchedule` | Agenda de geração | Extensão |

### 1.4 Competência, orçamento, fechamento

| Entidade | Descrição | Estado atual |
|----------|-----------|--------------|
| `CompetenceEntry` | Fato de competência (DRE) | Implícito via DRE |
| `Budget` | Orçamento por período | **Novo** |
| `BudgetLine` | Linha (plano/centro/mês) | **Novo** |
| `DailyClosing` | Fechamento de caixa do dia | **Novo** |
| `PeriodClosing` | Fechamento mensal/competência | **Novo (opcional 22.x)** |
| `ForecastScenario` | Cenário de projeção | **Novo** |
| `ForecastPoint` | Ponto (data, valor, tipo) | Parcial no Fluxo |

### 1.5 Read models

| Entidade | Descrição |
|----------|-----------|
| `CashFlowSnapshot` | Saldos + previstos + realizados por dia |
| `TreasuryPosition` | Posição consolidada de contas |
| `FinanceKpiSnapshot` | KPIs executivos materializados |

---

## 2. Value Objects

| VO | Campos |
|----|--------|
| `TenantId` | `value: string` |
| `Money` | `amount: number`, `currency: 'BRL'` |
| `Period` | `from: Date`, `to: Date` |
| `CompetenceMonth` | `year`, `month` |
| `MovementKind` | `in \| out \| transfer \| adjustment` |
| `DocumentRef` | `type`, `id` (OS, venda, NFe, …) |

---

## 3. Relacionamentos (diagrama textual)

```
Tenant
 ├── ChartOfAccounts
 │     └── AccountNode (parent → children)
 ├── CostCenter
 ├── FinanceCategory → Subcategory?
 ├── PaymentMethod
 ├── BankAccount ──────────────┐
 │     ├── BankMovement ◄─────┼── Settlement (Payable/Receivable)
 │     ├── Transfer (fromAccount ↔ toAccount → 2× BankMovement)
 │     └── CashRegister? (opcional, 1:N)
 ├── Payable
 │     ├── Settlement[]
 │     ├── Allocation[] → CostCenter / AccountNode
 │     ├── InstallmentPlan?
 │     └── RecurringExpense? → gera Payable
 ├── Receivable
 │     ├── Settlement[]
 │     ├── Allocation[]
 │     └── DocumentRef (venda / OS / contrato)
 ├── BankStatementLine → ReconciliationMatch → BankMovement
 ├── ReconciliationSession → matches[]
 ├── Budget → BudgetLine[] → (AccountNode | CostCenter | Period)
 ├── DailyClosing → BankAccount | CashRegister + movements do dia
 ├── ForecastScenario → ForecastPoint[]
 └── CashFlowSnapshot (read) ← movements + Payable/Receivable previstos
```

### Relacionamentos críticos

```
Payable ──1:N── Settlement ──N:1── BankMovement
Receivable ──1:N── Settlement ──N:1── BankMovement
Transfer ── creates ── BankMovement(out) + BankMovement(in)
BudgetLine ──N:1── AccountNode | CostCenter
DailyClosing ── locks ── movements do período (invariante)
CompetenceEntry ── derived from ── Vendas/CP/CR (fonte DRE)
```

---

## 4. Regras de domínio transversais

1. Toda entidade financeira possui `tenantId`.
2. Soft-delete preferencial (`deleted_at`) para histórico.
3. Pagamento/recebimento **não** duplica despesa/receita no DRE (fonte única).
4. Transferência é atômica (RPC / unit of work) — saldo A − X e B + X.
5. Fechamento diário impede alteração de movimentos do dia fechado (exceto reopen com RBAC alto + Audit).
6. Conciliação não altera valor do movimento; apenas status `reconciled`.
7. Verticais diferem por **configuração** (centros, planos, caixas), não por forks de código.

---

## 5. Mapeamento por vertical (configuração)

| Vertical | Ênfase |
|----------|--------|
| Oficina | CR↔OS, CP↔peças, centros por setor |
| Lava/Estética | Caixa rápido, recorrência de planos |
| Comércio | CMV, conciliação cartão, estoque |
| Serviços | Competência, parcelamento, projetos (centros) |
| PME | Orçamento + DRE + projeção |

---

## 6. Eventos de domínio (para Audit / Outbox / Timeline)

Exemplos: `PAYABLE_CREATED`, `PAYABLE_SETTLED`, `RECEIVABLE_SETTLED`, `TRANSFER_EXECUTED`, `DAY_CLOSED`, `DAY_REOPENED`, `RECONCILIATION_MATCHED`, `BUDGET_APPROVED`, `FORECAST_GENERATED`.
