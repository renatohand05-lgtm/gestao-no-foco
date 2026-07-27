# Finance Architecture — Gestão no Foco (Fase 22)

**Sprint:** 22.0 — Enterprise Finance Architecture (design only)  
**Versão alvo:** Fase 22  
**Status:** Fundação arquitetural — **sem implementação nesta sprint**  
**Data:** 2026-07-27

---

## 1. Propósito

Projetar o módulo financeiro Enterprise capaz de atender, com o mesmo núcleo multi-tenant:

| Vertical | Exemplos de uso financeiro |
|----------|----------------------------|
| Oficina mecânica | OS → CR, compras peças → CP, caixa diário |
| Centro automotivo | Múltiplos centros de custo (oficina, pneus, funilaria) |
| Lava rápido / estética | Ticket alto volume, caixa rápido, recorrência de planos |
| Comércio | Estoque/CMV, CR/CP, conciliação cartão |
| Prestação de serviços | Competência vs caixa, parcelamentos, projetos |
| PME geral | DRE, orçamento, projeção, tesouraria |

## 2. Princípios não negociáveis

1. **Reutilizar Fase 21** — RBAC, Audit, Workflow, Approval Runtime, Timeline, Observability, Notifications, Outbox, Idempotency.
2. **Não reinventar o financeiro maduro** — CR/CP, DRE, Fluxo, Plano de Contas, Centros, Contas Bancárias, Movimentações e Recorrências existentes em `lib/financeiro/` são a base.
3. **Uma fonte de verdade** — DRE = competência; Fluxo = caixa; Movimentação = fato bancário (ver DRE_ENTERPRISE.md).
4. **Server-first** — mutações via Server Actions; Client Components só interação.
5. **Multi-tenant primeiro** — todo aggregate carrega `tenantId`; RLS permanece a barreira de dados.
6. **DDD + Clean Architecture** — domínio puro → application services → adapters (Supabase) → App Router.
7. **Sem migrations nesta sprint** — contratos e docs apenas; schema evolui em sprints 22.x sob ADR.

## 3. Camadas propostas

```
app/(app)/[tenant]/financeiro/**          ← App Router (UI)
components/financeiro/**                   ← UI (já existente + novos dashboards)
lib/finance/                               ← NOVO pacote de domínio Enterprise Finance (Fase 22+)
  domain/          entities, VOs, aggregates (puro)
  application/     services, use-cases, DTOs
  ports/           repository contracts
  integrations/    bridges Fase 21 (audit, rbac, workflow, approval, timeline, obs)
lib/financeiro/                            ← LEGADO ESTÁVEL (manter; migrar gradualmente)
lib/enterprise/                            ← Fase 21 (não alterar nesta sprint)
```

> **Nota de migração:** Sprint 22.0 **não move código**. A partir de 22.1, novos bounded contexts nascem em `lib/finance/` e consomem/`wrap` services de `lib/financeiro/` até cutover seguro.

## 4. Bounded contexts

| Context | Responsabilidade | Aggregate raiz |
|---------|------------------|----------------|
| Treasury | Contas, caixa, transferências, saldos | `BankAccountAggregate` |
| Cash Flow | Entradas/saídas, projeção diária | `CashFlowAggregate` |
| Payables | Contas a pagar, baixas, rateio | `PayablesAggregate` |
| Receivables | Contas a receber, baixas | `ReceivablesAggregate` |
| Classification | Plano, categorias, centros, competência | `ChartOfAccountsAggregate` |
| Reconciliation | Extrato × movimentos | `ReconciliationAggregate` |
| Budgeting | Orçamento, metas financeiras | `BudgetAggregate` |
| Closing | Fechamento diário / período | `DailyClosingAggregate` |
| Forecasting | Projeções e cenários | `ForecastAggregate` |
| Intelligence | KPIs, alertas, anomalias (read model) | `FinanceKpiReadModel` |

## 5. Integração com Fase 21

```
Finance Application Service
  → assert RBAC (financeiro.*)
  → begin Trace / correlationId (Observability)
  → mutate Aggregate via Repository (tenant-scoped)
  → append Audit event
  → optional Workflow transition / Approval Runtime
  → enqueue Outbox (Notifications / side-effects)
  → Timeline consome (read-only)
  → Observability metrics (latency/errors)
```

**Não alterar** engines 21.x — apenas **consumir** via adapters/bridges.

## 6. Padrões validados

| Padrão | Como se aplica |
|--------|----------------|
| DDD | Aggregates por contexto; VOs (`Money`, `Period`, `TenantId`) |
| SOLID | Ports/adapters; services com SRP; DI via factories |
| Clean Architecture | domain ← application ← infrastructure |
| Server Actions | `create/update/delete/transfer/conciliate/forecast/closeDay/reopenDay` |
| App Router | RSC + Client só para filtros/forms |
| Multi Tenant | `tenantId` no aggregate + `requireTenant` + RLS |

## 7. Escalabilidade (tenants)

| Escala | Estratégia |
|--------|------------|
| 10 empresas | Modelo atual (Supabase + RLS) suficiente |
| 100 | Índices por `(tenant_id, data)`; paginação server-side; caches de saldo |
| 1.000 | Particionamento lógico por tenant; materialização de saldos diários; outbox workers |
| 10.000 | Read replicas / projections; sharding lógico de tenants quentes; filas por tenant; KPIs pré-agregados |

Sempre: **queries tenant-first**, nunca full-table cross-tenant.

## 8. Documentos da fundação

| Doc | Conteúdo |
|-----|----------|
| [FINANCE_DOMAIN.md](./FINANCE_DOMAIN.md) | Entidades e relacionamentos |
| [FINANCE_AGGREGATES.md](./FINANCE_AGGREGATES.md) | Aggregates e invariantes |
| [FINANCE_SERVICES.md](./FINANCE_SERVICES.md) | Services, repos, actions |
| [FINANCE_KPIS.md](./FINANCE_KPIS.md) | KPIs e dashboards |
| [FINANCE_ROADMAP.md](./FINANCE_ROADMAP.md) | Sprints 22.1–22.10 |

## 9. Fora de escopo (22.0)

- Migrations / alteração de banco / RLS
- Implementação de services/UI
- Alteração de RBAC/Audit/Workflow/Timeline/Observability
- Git add / commit / push / deploy
