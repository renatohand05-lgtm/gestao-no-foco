# Sprint 32.2 — Matriz de qualidade de dados (KPIs mobile)

Regra: **zero real ≠ indisponível ≠ erro ≠ lista vazia válida**.

| Módulo | KPI | Source / service | API | Tenant | Branch | Empty | Erro | Atualização |
|--------|-----|------------------|-----|--------|--------|-------|------|-------------|
| Dashboard | KPIs cockpit (faturamento, OS, caixa…) | `dashboard-compose` → DashboardService / vendas / financial cockpit | `GET .../dashboard` | sim | header opcional | `unavailable` / "Indisponível" | ErrorState | pull + boot |
| Inteligência | Pack exec + operacional | `intelligence-compose` | `GET .../inteligencia` (+ siblings) | sim | sim | null + `unavailable[]` | ErrorState | pull |
| Financeiro | saldo, entradas, saídas, AP/AR, vencidos, projetado, resultado, margem | `finance-compose` → ContaPagar/Receber, FluxoCaixa, DreService | `GET .../financeiro/summary` | sim | sim | null → "—" + banner | ErrorState / FORBIDDEN | pull; offline RO snapshot |
| Financeiro | DRE / fluxo / listas | mesmos services Web | rotas finance filhas | sim | sim | lista vazia válida | erro explícito | pull |
| CRM | receita prevista/fechada/provável, pipeline, conversão, ticket | `crm-compose` → CrmOportunidadeService / forecast | `GET .../crm/dashboard` | sim | sim | pipeline vazio = alerta válido **só se carga OK** | `unavailable: oportunidades` + KPIs null (32.2) | pull |
| CRM | follow-ups | `cliente_tarefas` | dashboard / followups | sim | — | 0 válido se carga OK | `unavailable: follow_ups` + null (32.2) | pull |
| Estoque | valor, críticos, ruptura, compras | `stock-compose` → Estoque*Service | `GET .../estoque/dashboard` | sim | sim | null → "—" | unavailable / ErrorState | pull |
| Operação | cards OS, agenda, equipe | `operations-compose` → CentroOperacoes / OsDashboard | `GET .../operacao/dashboard` | sim | sim | null → "—" | unavailable / ErrorState | pull |

## Garantias

- Nenhuma soma cross-tenant (queries com `tenant_id`).
- Soft-fail de domínio → campo null + `unavailable[]`, não zero forçado (Finance/Stock/Ops; CRM corrigido em 32.2).
- Lista vazia de pipeline/oportunidades com carga OK = estado válido.
- Falha de API de oportunidades ≠ pipeline vazio.
