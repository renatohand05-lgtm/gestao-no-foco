# Finance Roadmap — Fase 22

**Sprint 22.0:** Architecture (este documento) — **concluída como design**  
**Premissa:** reutilizar `lib/financeiro/` + Fase 21; migrations só quando a sprint explicitar.

---

## Visão por sprint

| Sprint | Título | Entrega principal |
|--------|--------|-------------------|
| **22.0** | Enterprise Finance Architecture | Docs de fundação (este pacote) |
| **22.1** | Finance Domain Skeleton | `lib/finance/` ports + VOs + wrappers sem breaking change |
| **22.2** | Treasury Hardening | Transfer UI + TransferService formal + RBAC `transferir` |
| **22.3** | Cash Flow Enterprise | CashFlowAggregate/read model, performance, filtros avançados |
| **22.4** | Payables & Receivables Unification | Facades aggregates + eventos Audit/Timeline padronizados |
| **22.5** | Daily Closing | ClosingService + closeDay/reopenDay + UI caixa |
| **22.6** | Bank Reconciliation | Import extrato + match + sessão + `financeiro.conciliar` |
| **22.7** | Budgeting | BudgetAggregate + Approval Runtime para approve |
| **22.8** | Forecast & Projection | ForecastService + cenários + KPIs saldo futuro |
| **22.9** | Executive Finance Dashboards | Executivo, Tesouraria, Centros analytics + KPIs completos |
| **22.10** | Finance RC | Hardening, docs, gates, vertical configs (oficina/lava/comércio) |

---

## Detalhamento

### 22.1 — Domain Skeleton
- Criar estrutura `lib/finance/{domain,application,ports,integrations}`
- Contratos de repositório (interfaces only / adapters thin wrapping existing services)
- Bridge Observability + Audit em 1–2 fluxos piloto (ex.: transferência)
- **Sem** migration

### 22.2 — Treasury Hardening
- UI de transferência bancária
- Idempotency em transfer
- Testes de isolamento tenant
- Opcional: `CashRegister` (design → schema se aprovado)

### 22.3 — Cash Flow Enterprise
- Otimizar snapshot (materialização opcional)
- Paginação/filtros enterprise
- Alinhar com `CashFlowAggregate`

### 22.4 — CR/CP Unification
- Padronizar eventos de domínio
- Workflow opcional (estados)
- Approval Runtime para baixas acima do limite

### 22.5 — Daily Closing
- Schema `daily_closings` (migration nesta sprint)
- Bloqueio de edição pós-fechamento
- Reopen com Audit + RBAC alto

### 22.6 — Reconciliation
- Schema extrato/matches
- Import CSV/OFX (adapter)
- Sugestão de match por valor/data

### 22.7 — Budgeting
- Schema budgets/lines
- Submit → Approval Runtime
- Orçado × realizado no dashboard de centros

### 22.8 — Forecast
- Geração base (heurística; IA opcional)
- Cenários base/otimista/pessimista
- KPIs saldo futuro / runway

### 22.9 — Dashboards
- Financeiro Executivo
- Tesouraria
- Conciliação (ops)
- Centros de Custo analytics
- Alertas + insights

### 22.10 — Finance RC
- Checklist vertical (oficina, lava, comércio, serviços)
- Performance 100–1.000 tenants (índices/projections)
- Lint/build/test gates
- Release notes Fase 22 Finance RC

---

## Dependências Fase 21 (consumo apenas)

```
22.x Finance
  ├── RBAC (financeiro.*)
  ├── Audit
  ├── Workflow (opcional)
  ├── Approval Runtime (budget, limites, reopen)
  ├── Notifications
  ├── Timeline (eventos financeiros)
  ├── Observability (métricas actions)
  └── Outbox / Idempotency
```

**Proibido:** alterar engines 21.x nestas sprints salvo hotfix crítico aprovado.

---

## Riscos do roadmap

| Risco | Mitigação |
|-------|-----------|
| Big-bang rewrite de `lib/financeiro` | Wrappers graduais; cutover por contexto |
| Migrations grandes | Uma capability por sprint; ADR por schema |
| Conciliação bancária complexa | MVP CSV + match manual antes de Open Banking |
| Verticais divergirem o core | Feature flags / config por tenant, não forks |

---

## Critério de sucesso Fase 22

- Tesouraria completa (transfer + closing + conciliação MVP)
- Orçamento + forecast conectados a Approval/Timeline
- Dashboards executivos com KPIs canônicos
- Gates verdes + multi-tenant isolado
- Nenhuma regressão DRE/Fluxo/CR/CP existentes
