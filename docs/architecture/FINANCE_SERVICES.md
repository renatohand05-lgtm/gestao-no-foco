# Finance Services, Repositories & Server Actions — Fase 22

**Sprint:** 22.0 (design) · **Sem implementação nesta sprint**

---

## 1. Application Services (projetados)

| Service | Responsabilidade | Base atual |
|---------|------------------|------------|
| `CashFlowService` | Snapshot, filtros, série diária, saldos | `fluxo-caixa-service.ts` |
| `ForecastService` | Cenários, geração, ajuste | Extensão do Fluxo |
| `ReconciliationService` | Import, match, close session | **Novo** |
| `TransferService` | Transferências atômicas | `movimentacao-bancaria-service.createTransferencia` |
| `ClosingService` | `closeDay` / `reopenDay` | **Novo** |
| `BudgetService` | CRUD orçamento + submit/approve | **Novo** |
| `ProjectionService` | Alias/orquestração Forecast + CashFlow | **Novo** |
| `TreasuryService` | Posição consolidada, caixas | Contas + movimentos |
| `PayablesService` | Facade sobre aggregate CP | `conta-pagar-service.ts` |
| `ReceivablesService` | Facade sobre aggregate CR | `conta-receber-service.ts` |
| `ClassificationService` | Plano/categorias/centros | services existentes |
| `FinanceKpiService` | Cálculo/read de KPIs | `financial-intelligence` + novo |
| `FinanceIntegrationService` | Bridges Fase 21 | **Novo (só glue)** |

### Contratos de serviço (assinaturas ilustrativas)

```ts
// ports — não implementar em 22.0
interface CashFlowService {
  getFluxo(tenantId: string, query: CashFlowQuery): Promise<CashFlowSnapshot>;
}

interface TransferService {
  transfer(tenantId: string, input: TransferInput, actor: ActorRef): Promise<Transfer>;
}

interface ReconciliationService {
  importStatement(tenantId: string, input: StatementImport): Promise<ReconciliationSession>;
  match(tenantId: string, sessionId: string, match: MatchInput): Promise<void>;
  closeSession(tenantId: string, sessionId: string): Promise<void>;
}

interface ClosingService {
  closeDay(tenantId: string, input: CloseDayInput): Promise<DailyClosing>;
  reopenDay(tenantId: string, closingId: string, reason: string): Promise<DailyClosing>;
}

interface BudgetService {
  create(tenantId: string, draft: BudgetDraft): Promise<Budget>;
  submit(tenantId: string, budgetId: string): Promise<Budget>;
  // approve via Approval Runtime
}

interface ForecastService {
  generate(tenantId: string, scenario: ForecastGenerateInput): Promise<ForecastScenario>;
}
```

---

## 2. Repository contracts (ports — sem implementação)

```ts
interface BankAccountRepository {
  findById(tenantId: string, id: string): Promise<BankAccount | null>;
  list(tenantId: string, q?: ListQuery): Promise<BankAccount[]>;
  save(account: BankAccount): Promise<void>;
}

interface BankMovementRepository {
  listByAccount(tenantId: string, accountId: string, period: Period): Promise<BankMovement[]>;
  save(movement: BankMovement): Promise<void>;
  saveTransferPair(out: BankMovement, inn: BankMovement, transfer: Transfer): Promise<void>;
}

interface PayableRepository {
  findById(tenantId: string, id: string): Promise<Payable | null>;
  list(tenantId: string, q: PayableQuery): Promise<Paged<Payable>>;
  save(payable: Payable): Promise<void>;
}

interface ReceivableRepository {
  findById(tenantId: string, id: string): Promise<Receivable | null>;
  list(tenantId: string, q: ReceivableQuery): Promise<Paged<Receivable>>;
  save(receivable: Receivable): Promise<void>;
}

interface ReconciliationRepository {
  findSession(tenantId: string, id: string): Promise<ReconciliationSession | null>;
  saveSession(session: ReconciliationSession): Promise<void>;
}

interface BudgetRepository {
  findById(tenantId: string, id: string): Promise<Budget | null>;
  list(tenantId: string, period?: Period): Promise<Budget[]>;
  save(budget: Budget): Promise<void>;
}

interface DailyClosingRepository {
  findByDay(tenantId: string, date: string, scopeId: string): Promise<DailyClosing | null>;
  save(closing: DailyClosing): Promise<void>;
}

interface ForecastRepository {
  findScenario(tenantId: string, id: string): Promise<ForecastScenario | null>;
  save(scenario: ForecastScenario): Promise<void>;
}

interface CashFlowReadRepository {
  getSnapshot(tenantId: string, query: CashFlowQuery): Promise<CashFlowSnapshot>;
}

interface FinanceKpiReadRepository {
  getSnapshot(tenantId: string, period: Period): Promise<FinanceKpiSnapshot>;
}
```

> Adapters Supabase / memory nascem nas sprints de implementação. Até lá, services atuais de `lib/financeiro/` continuam oficiais.

---

## 3. Server Actions (planejamento)

Namespace sugerido: `lib/finance/actions.ts` (novo) **ou** extensão gradual de `lib/financeiro/actions.ts`.

| Action | Permissão RBAC (existente/alvo) | Aggregate |
|--------|----------------------------------|-----------|
| `createPayableAction` / CR equivalentes | `financeiro.criar` | Payables/Receivables |
| `update*Action` | `financeiro.editar` | * |
| `delete*Action` (soft) | `financeiro.excluir` | * |
| `transferAction` | `financeiro.transferir` | Transfer |
| `conciliateAction` / `matchReconciliationAction` | `financeiro.conciliar` | Reconciliation |
| `forecastAction` | `financeiro.visualizar` (+ futuro `projetar`) | Forecast |
| `closeDayAction` | `financeiro.fechar` (a catalogar) | DailyClosing |
| `reopenDayAction` | `financeiro.reabrir` (alto) | DailyClosing |
| `submitBudgetAction` | `financeiro.editar` + Approval | Budget |

### Fluxo padrão de action

```
requireTenant(slug)
→ getCurrentProfile()
→ RBAC assert
→ Zod validate
→ Service command (+ correlationId)
→ Audit.append
→ Outbox (se necessário)
→ revalidatePath
→ ActionResult
```

Client Components **nunca** escrevem no Supabase financeiro diretamente.

---

## 4. Integrações Fase 21 (glue)

| Capacidade | Uso no Finance |
|------------|----------------|
| RBAC | Gate em toda action/service |
| Audit | Todo comando de mutação |
| Workflow | Estados de Payable/Receivable/Budget (opcional) |
| Approval Runtime | Orçamento, baixas acima do limite, reopen day |
| Notifications | Vencimentos, fechamento divergente, anomalias |
| Timeline | Eventos financeiros agregados |
| Observability | Latency/errors das actions financeiras |
| Outbox / Idempotency | Transferências, gerações em lote, webhooks bancários |

---

## 5. Dashboards (rotas alvo)

| Dashboard | Rota sugerida | Service |
|-----------|---------------|---------|
| Financeiro Executivo | `/financeiro` ou `/financeiro/executivo` | `FinanceKpiService` |
| Fluxo de Caixa | `/financeiro/fluxo-caixa` | `CashFlowService` |
| Conciliação | `/financeiro/conciliacao` | `ReconciliationService` |
| Tesouraria | `/financeiro/tesouraria` | `TreasuryService` |
| Centros de Custo | `/financeiro/centros-custo` (+ analytics) | Classification + KPIs |
