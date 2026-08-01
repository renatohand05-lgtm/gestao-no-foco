# Auditoria inicial — Sprint 27.6.1

## Matriz de dependências (antes das correções)

| Componente | Estado atual | Fonte | Persistência | Risco | Correção |
|---|---|---|---|---|---|
| `audit/recorder.ts` STORE[] | In-memory global | Eventos do copiloto | Processo | Histórico some no restart; cross-request leak | Repositório Supabase + schema unavailable |
| `feedback/store.ts` FEEDBACK[] | In-memory | UI feedback | Processo | Feedback perdido | `intelligence_feedback` |
| `evidence/registry.ts` Map | In-memory global | makeMetricEvidence | Processo | Evidência não durável; possível bleed | Escopo de request + persistência por message |
| `cost/guard.ts` counters Map | In-memory rate limit | Budget | Processo | Aceitável (não é histórico) | Manter (não é persistência de negócio) |
| `askIntelligenceAction` | `metrics: []` | Nenhuma | N/A | Snapshot vazio → confiança indisponível | Live context adapters |
| Histórico UI | Texto placeholder | — | Nenhuma | Falso “não implementado” vs memória audit | Listar sessions/messages ou pending |
| Auditoria UI | `listIntelligenceAudit` memory | STORE | Processo | Mentira de auditoria | Repo + pending state |
| Domains finance/modules | Métricas passadas pelo caller | Caller | N/A | OK se caller live | Actions passam adapters |
| Provider gateway | Deterministic ON / external stub OFF | Flags | N/A | OK | Manter OFF explícito |
| Prompt registry | Templates estáticos | Código | N/A | OK | Sem mudança |

## Rotas / actions

| Rota / action | Auth | Dados |
|---|---|---|
| `/{tenant}/inteligencia` | `inteligencia.visualizar` | Hub |
| `.../copiloto` | `inteligencia.perguntar` | `askIntelligenceAction` |
| `.../historico` | visualizar | Pending / sessions |
| `.../auditoria` | ver_auditoria | Audit repo |
| `.../configuracoes` | visualizar | Flags + health |
| `askIntelligenceAction` | permissions array | **metrics: [] (bug)** |
| `submitIntelligenceFeedbackAction` | — | memory store |
| `getIntelligenceAuditAction` | — | memory store |

## Fontes canônicas a conectar

- Cash: `getCashIntelligenceDashboard` / cockpit financeiro
- DRE: `createDreService().getDre`
- Vendas: `aggregateFaturamento` / resumo mês
- CRM: `createCrmDashboardService().getKpis` / executive CRM
- OS: `createOsDashboardService().getData`
- Supply: `getExecutiveSupplyDashboard` / KPI resolver
